"""Smoke test 3/3: account deletion (and that direct messages are gone). Run on a freshly seeded DB: python3 -I test/smoke_3.py"""
import json
import os
import subprocess
import sys
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

# ---- direct messages were removed from the product
s_, r_ = call("GET", "/messages/conversations", token=tok["a"])
check("/messages/* no longer exists (404)", s_ == 404, (s_, r_))
s_, r_ = call("POST", "/messages/conversations", {"anonymousId": anon["b"]}, token=tok["a"])
check("starting a conversation is gone (404)", s_ == 404, (s_, r_))
check("no message tables in the database", sql("SELECT count(*) FROM information_schema.tables WHERE table_name IN ('Conversation', 'Message')") == "0")


# ---- account deletion
# D posts; E comments on D's post; D comments on E's post; D submits to harborline (4 -> 5 contributors)
s, post_d = call("POST", "/discussions/posts", {"title": "D's post", "body": "from D", "tags": ["pay gap"]}, token=tok["d"])
s, post_e = call("POST", "/discussions/posts", {"title": "E's post", "body": "from E", "tags": ["pay gap"]}, token=tok["e"])
call("POST", f"/discussions/posts/{post_d['id']}/comments", {"body": "E on D's post"}, token=tok["e"])
call("POST", f"/discussions/posts/{post_e['id']}/comments", {"body": "D on E's post"}, token=tok["d"])
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
s, h = call("GET", "/companies/harborline-financial", token=tok["e"])
check("aggregates recomputed: harborline salary back to 4 contributors, summary hidden again", h["userReported"]["salary"]["eligibleContributors"] == 4 and h["userReported"]["salary"]["summary"] is None, h["userReported"]["salary"])
check("no rows left for D in any table", all(sql(q) == "0" for q in [
    f"SELECT count(*) FROM \"User\" WHERE id = '{uid['d']}'",
    f"SELECT count(*) FROM \"Session\" WHERE \"userId\" = '{uid['d']}'",
    f"SELECT count(*) FROM \"Assessment\" WHERE \"userId\" = '{uid['d']}'",
    f"SELECT count(*) FROM \"ReadPost\" WHERE \"userId\" = '{uid['d']}'",
    f"SELECT count(*) FROM \"Submission\" WHERE \"userId\" = '{uid['d']}'",
    f"SELECT count(*) FROM \"Post\" WHERE \"authorRefId\" = '{anon['d']}'",
    f"SELECT count(*) FROM \"Comment\" WHERE \"authorRefId\" = '{anon['d']}'",
]))
again = sign_in(f"d{stamp}@example.com")
check("same email can sign up again as a brand-new account", again["isNewAccount"] is True and again["user"]["id"] != uid["d"] and again["user"]["anonymousIdentity"]["id"] != anon["d"] and again["user"]["hasCompletedAssessment"] is False, again["user"])

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
