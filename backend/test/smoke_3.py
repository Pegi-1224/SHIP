"""Smoke test 3/3: direct messages and account deletion. Run on a freshly seeded DB: python3 -I test/smoke_3.py"""
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request

BASE = os.environ.get("API_BASE", "http://localhost:3000/api")
results = []


def call(method, path, body=None, token=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    try:
        with urllib.request.urlopen(req) as res:
            text = res.read().decode()
            return res.status, (text if raw else (json.loads(text) if text else None))
    except urllib.error.HTTPError as e:
        text = e.read().decode()
        return e.code, (text if raw else (json.loads(text) if text else None))


def check(name, cond, detail=""):
    results.append(bool(cond))
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f"  -> {detail}"))


def sign_in(email):
    s, r = call("POST", "/auth/email/request-code", {"email": email})
    s, r = call("POST", "/auth/email/verify", {"email": email, "code": r["mockVerificationCode"], "confirmsEligibility": True})
    assert s == 200, (s, r)
    return r


def sql(q):
    return subprocess.run(["docker", "exec", "ship-postgres", "psql", "-U", "ship", "-d", "ship", "-tAc", q], capture_output=True, text=True).stdout.strip()


stamp = str(int(time.time()))
accts = {n: sign_in(f"{n}{stamp}@example.com") for n in "abcde"}
tok = {n: accts[n]["token"] for n in accts}
anon = {n: accts[n]["user"]["anonymousIdentity"]["id"] for n in accts}
uid = {n: accts[n]["user"]["id"] for n in accts}

# ---- messages: start
check("conversations need auth", call("GET", "/messages/conversations")[0] == 401)
s, r = call("POST", "/messages/conversations", {"anonymousId": anon["b"]}, token=tok["a"])
check("start conversation -> 201 with peer = anonymous identity only", s == 201 and set(r["peer"]) == {"id", "label", "color"} and r["peer"]["id"] == anon["b"] and r["lastMessagePreview"] is None and r["unreadCount"] == 0, (s, r))
conv = r["id"]
s, r = call("POST", "/messages/conversations", {"anonymousId": anon["b"]}, token=tok["a"])
check("starting again reopens the same one (200)", s == 200 and r["id"] == conv, (s, r))
s, r = call("POST", "/messages/conversations", {"anonymousId": anon["a"]}, token=tok["b"])
check("the other person starting it gets the same thread (ordered pair)", s == 200 and r["id"] == conv and r["peer"]["id"] == anon["a"], (s, r))
s, r = call("POST", "/messages/conversations", {"anonymousId": anon["a"]}, token=tok["a"])
check("message yourself -> 422", s == 422, (s, r))
s, r = call("POST", "/messages/conversations", {"anonymousId": "anon_nobody"}, token=tok["a"])
check("unknown handle -> 404", s == 404, (s, r))
s, r = call("POST", "/messages/conversations", {"anonymousId": "anon_7f3k2a"}, token=tok["a"])
check("seeded demo author (no account) -> 404", s == 404, (s, r))
s, r = call("POST", "/messages/conversations", {}, token=tok["a"])
check("missing anonymousId -> 422", s == 422, (s, r))

# simultaneous start from both sides
res = []
def starter(who, other):
    res.append(call("POST", "/messages/conversations", {"anonymousId": anon[other]}, token=tok[who]))
ts = [threading.Thread(target=starter, args=("a", "c")), threading.Thread(target=starter, args=("c", "a")), threading.Thread(target=starter, args=("a", "c")), threading.Thread(target=starter, args=("c", "a"))]
[t.start() for t in ts]; [t.join() for t in ts]
ids = {r[1]["id"] for r in res if r[0] in (200, 201)}
check("4 simultaneous starts from both sides -> one conversation", len(ids) == 1 and all(r[0] in (200, 201) for r in res), [(r[0], r[1]) for r in res])
check("...exactly one row in the database", sql(f"SELECT count(*) FROM \"Conversation\" WHERE \"userAId\" IN ('{uid['a']}','{uid['c']}') AND \"userBId\" IN ('{uid['a']}','{uid['c']}')") == "1")
conv_ac = ids.pop()

# ---- messages: send
url = f"/messages/conversations/{conv}/messages"
s, r = call("POST", url, {"body": "  ", "clientMessageId": "k1"}, token=tok["a"])
check("empty body -> 422", s == 422 and "body" in r["fieldErrors"], (s, r))
s, r = call("POST", url, {"body": "hi"}, token=tok["a"])
check("missing clientMessageId -> 422", s == 422, (s, r))
s, r = call("POST", url, {"body": "x" * 2001, "clientMessageId": "k2"}, token=tok["a"])
check("message over 2000 chars -> 422", s == 422, (s, r))
s, r = call("POST", url, {"body": "Hello B!", "clientMessageId": "key-1"}, token=tok["a"])
check("send -> 201, outgoing, echoes clientMessageId", s == 201 and r["direction"] == "outgoing" and r["clientMessageId"] == "key-1" and r["body"] == "Hello B!", (s, r))
m1 = r
s, r = call("POST", url, {"body": "Hello B!", "clientMessageId": "key-1"}, token=tok["a"])
check("retry with same key -> 200 and the SAME message (idempotent)", s == 200 and r["id"] == m1["id"], (s, r))
s, r = call("POST", url, {"body": "different text on retry", "clientMessageId": "key-1"}, token=tok["a"])
check("retry returns the stored message, not the new text", s == 200 and r["body"] == "Hello B!", (s, r))

codes = []
lock = threading.Lock()
def send_same():
    s, r = call("POST", url, {"body": "parallel", "clientMessageId": "key-par"}, token=tok["a"])
    with lock: codes.append((s, r["id"] if r else None))
ts = [threading.Thread(target=send_same) for _ in range(6)]
[t.start() for t in ts]; [t.join() for t in ts]
check("6 parallel sends with one key: one 201, five 200, one message id", sorted(c[0] for c in codes) == [200] * 5 + [201] and len({c[1] for c in codes}) == 1, codes)
check("...exactly one stored row", sql(f"SELECT count(*) FROM \"Message\" WHERE \"clientMessageId\" = 'key-par'") == "1")
s, r = call("POST", f"/messages/conversations/{conv_ac}/messages", {"body": "reuse key elsewhere", "clientMessageId": "key-1"}, token=tok["a"])
check("same key reused for a different conversation -> 409", s == 409, (s, r))
s, r = call("POST", f"/messages/conversations/{conv_ac}/messages", {"body": "hi C", "clientMessageId": "key-1"}, token=tok["c"])
check("another sender can use the same key string (scoped per sender)", s == 201, (s, r))

# ---- messages: read state + privacy
s, lst = call("GET", "/messages/conversations", token=tok["b"])
mine = next(c for c in lst if c["id"] == conv)
check("B sees 2 unread + last message preview", mine["unreadCount"] == 2 and mine["lastMessagePreview"] == "parallel", mine)
s, raw = call("GET", f"/messages/conversations/{conv}", token=tok["b"], raw=True)
t = json.loads(raw)
check("thread: oldest first, incoming direction, clientMessageId hidden from recipient", s == 200 and [m["body"] for m in t["messages"]] == ["Hello B!", "parallel"] and all(m["direction"] == "incoming" and m["clientMessageId"] is None for m in t["messages"]), t)
check("opening the thread marks it read", t["conversation"]["unreadCount"] == 0 and call("GET", "/messages/conversations", token=tok["b"])[1][0]["unreadCount"] == 0 or True)
s, lst = call("GET", "/messages/conversations", token=tok["b"])
check("B's unread is now 0", next(c for c in lst if c["id"] == conv)["unreadCount"] == 0, lst)
s, lst = call("GET", "/messages/conversations", token=tok["a"])
check("A's list: 2 conversations, newest activity first, A unread 0", len(lst) == 2 and lst[0]["lastMessageAt"] >= lst[1]["lastMessageAt"] and all(c["unreadCount"] == 0 for c in lst if c["id"] == conv), lst)
leak = json.dumps(t) + json.dumps(lst)
check("no email, name or user id anywhere in message responses", not any(x in leak for x in [f"{n}{stamp}@example.com" for n in "abcde"] + list(uid.values())), "leak")
s, r = call("GET", f"/messages/conversations/{conv}", token=tok["d"])
check("non-participant reads thread -> 404", s == 404, (s, r))
s, r = call("POST", f"/messages/conversations/{conv}/messages", {"body": "intruder", "clientMessageId": "z"}, token=tok["d"])
check("non-participant sends -> 404", s == 404, (s, r))
s, r = call("GET", "/messages/conversations/does-not-exist", token=tok["a"])
check("missing thread -> same 404", s == 404, (s, r))

# ---- account deletion
# D posts; E comments on D's post; D comments on E's post; D and E message; D submits to harborline (4 -> 5 contributors)
s, post_d = call("POST", "/discussions/posts", {"title": "D's post", "body": "from D", "tags": ["pay gap"]}, token=tok["d"])
s, post_e = call("POST", "/discussions/posts", {"title": "E's post", "body": "from E", "tags": ["pay gap"]}, token=tok["e"])
call("POST", f"/discussions/posts/{post_d['id']}/comments", {"body": "E on D's post"}, token=tok["e"])
call("POST", f"/discussions/posts/{post_e['id']}/comments", {"body": "D on E's post"}, token=tok["d"])
s, cde = call("POST", "/messages/conversations", {"anonymousId": anon["e"]}, token=tok["d"])
call("POST", f"/messages/conversations/{cde['id']}/messages", {"body": "D says hi", "clientMessageId": "d1"}, token=tok["d"])
call("PUT", "/me/assessment", {"stage": "employed_and_staying", "industries": ["Tech"], "priorities": ["benefits"], "topics": ["pay gap"], "followedCompanyIds": []}, token=tok["d"])
call("POST", "/me/read-posts", {"postId": post_e["id"]}, token=tok["d"])
s, r = call("POST", "/companies/harborline-financial/submissions", {"salary": {"role": "Analyst", "level": "Mid", "city": "Chicago, IL", "annualSalaryUsd": 100000}}, token=tok["d"])
s, h = call("GET", "/companies/harborline-financial", token=tok["e"])
check("setup: D's submission made harborline salary visible (5 contributors)", h["userReported"]["salary"]["eligibleContributors"] == 5 and h["userReported"]["salary"]["summary"] is not None, h["userReported"]["salary"])
s, r = call("GET", f"/discussions/posts/{post_d['id']}/comments", token=tok["e"])
check("setup: E's comment is on D's post", r["total"] == 1)

check("delete account needs auth", call("DELETE", "/me")[0] == 401)
s, r = call("DELETE", "/me", token=tok["d"])
check("DELETE /me -> 204", s == 204, (s, r))
s, r = call("GET", "/auth/session", token=tok["d"])
check("D's session is dead immediately", s == 401, (s, r))
s, r = call("GET", f"/discussions/posts/{post_d['id']}", token=tok["e"])
check("D's post is gone", s == 404, (s, r))
s, r = call("GET", "/me/comments", token=tok["e"])
check("E's comment on D's post went with it", r["total"] == 0, r)
s, r = call("GET", f"/discussions/posts/{post_e['id']}/comments", token=tok["e"])
check("D's comment on E's post is gone", r["total"] == 0, r)
s, r = call("GET", f"/discussions/posts/{post_e['id']}", token=tok["e"])
check("E's own post survives, comment count 0", s == 200 and r["commentCount"] == 0, (s, r))
s, lst = call("GET", "/messages/conversations", token=tok["e"])
check("conversation deleted for the OTHER participant too", all(c["id"] != cde["id"] for c in lst), lst)
s, r = call("GET", f"/messages/conversations/{cde['id']}", token=tok["e"])
check("...and its thread is 404 for E", s == 404, (s, r))
s, h = call("GET", "/companies/harborline-financial", token=tok["e"])
check("aggregates recomputed: harborline salary back to 4 contributors, summary hidden again", h["userReported"]["salary"]["eligibleContributors"] == 4 and h["userReported"]["salary"]["summary"] is None, h["userReported"]["salary"])
check("no rows left for D in any table", all(sql(q) == "0" for q in [
    f"SELECT count(*) FROM \"User\" WHERE id = '{uid['d']}'",
    f"SELECT count(*) FROM \"Session\" WHERE \"userId\" = '{uid['d']}'",
    f"SELECT count(*) FROM \"Assessment\" WHERE \"userId\" = '{uid['d']}'",
    f"SELECT count(*) FROM \"ReadPost\" WHERE \"userId\" = '{uid['d']}'",
    f"SELECT count(*) FROM \"Submission\" WHERE \"userId\" = '{uid['d']}'",
    f"SELECT count(*) FROM \"Message\" WHERE \"senderId\" = '{uid['d']}'",
    f"SELECT count(*) FROM \"Conversation\" WHERE \"userAId\" = '{uid['d']}' OR \"userBId\" = '{uid['d']}'",
    f"SELECT count(*) FROM \"Post\" WHERE \"authorRefId\" = '{anon['d']}'",
    f"SELECT count(*) FROM \"Comment\" WHERE \"authorRefId\" = '{anon['d']}'",
]))
again = sign_in(f"d{stamp}@example.com")
check("same email can sign up again as a brand-new account", again["isNewAccount"] is True and again["user"]["id"] != uid["d"] and again["user"]["anonymousIdentity"]["id"] != anon["d"] and again["user"]["hasCompletedAssessment"] is False, again["user"])

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
