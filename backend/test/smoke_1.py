"""Smoke test 1/3: auth, assessment, discussions, home, me. Run against a live backend on a freshly seeded DB: python3 -I test/smoke_1.py"""
import json
import os
import sys
import time
import urllib.error
import urllib.request

BASE = os.environ.get("API_BASE", "http://localhost:3000/api")
results = []


def call(method, path, body=None, token=None, headers=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(BASE + path, data=data, method=method)
    if body is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    for k, v in (headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as res:
            raw = res.read()
            return res.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        raw = e.read()
        return e.code, (json.loads(raw) if raw else None)


def check(name, cond, detail=""):
    results.append(cond)
    print(("PASS " if cond else "FAIL ") + name + ("" if cond else f"  -> {detail}"))


def sign_in(email, eligible=True):
    s, r = call("POST", "/auth/email/request-code", {"email": email})
    assert s == 200, (s, r)
    s, r = call("POST", "/auth/email/verify", {"email": email, "code": r["mockVerificationCode"], "confirmsEligibility": eligible})
    assert s == 200, (s, r)
    return r


stamp = str(int(time.time()))
a_email, b_email = f"alice{stamp}@example.com", f"bob{stamp}@example.com"

# ---- authentication
s, r = call("GET", "/auth/session")
check("session without token -> 401 unauthorized", s == 401 and r["code"] == "unauthorized", (s, r))
s, r = call("GET", "/auth/session", token="token_bogus")
check("session with bogus token -> 401", s == 401, (s, r))

s, r = call("POST", "/auth/email/request-code", {"email": "not-an-email"})
check("request-code bad email -> 422 with fieldErrors.email", s == 422 and "email" in r["fieldErrors"], (s, r))

s, r = call("POST", "/auth/email/request-code", {"email": a_email})
check("request-code ok, returns cooldown + dev code", s == 200 and r["resendAvailableInSeconds"] == 30 and len(r["mockVerificationCode"]) == 6, (s, r))
code = r["mockVerificationCode"]
s, r2 = call("POST", "/auth/email/request-code", {"email": a_email})
check("second request-code inside cooldown -> 429 rate_limited", s == 429 and r2["code"] == "rate_limited", (s, r2))

s, r = call("POST", "/auth/email/verify", {"email": a_email, "code": "000000", "confirmsEligibility": True})
check("verify wrong code -> 422", s == 422 and "code" in r["fieldErrors"], (s, r))
s, r = call("POST", "/auth/email/verify", {"email": a_email, "code": code})
check("verify new account without eligibility -> 422 (code NOT consumed)", s == 422 and "confirmsEligibility" in r["fieldErrors"], (s, r))
s, r = call("POST", "/auth/email/verify", {"email": a_email, "code": code, "confirmsEligibility": True})
check("verify ok -> token, isNewAccount", s == 200 and r["isNewAccount"] is True and r["token"].startswith("token_"), (s, r))
alice = r
a_tok = r["token"]
check("session user has email + anonymousIdentity, no assessment yet", r["user"]["email"] == a_email and r["user"]["anonymousIdentity"]["id"].startswith("anon_") and r["user"]["hasCompletedAssessment"] is False, r["user"])
s, r = call("POST", "/auth/email/verify", {"email": a_email, "code": code, "confirmsEligibility": True})
check("replaying a used code -> 422", s == 422, (s, r))
s, r = call("GET", "/auth/session", token=a_tok)
check("session with token -> 200", s == 200 and r["email"] == a_email, (s, r))

# attempts lockout
s, r = call("POST", "/auth/email/request-code", {"email": f"lock{stamp}@example.com"})
lock_email = f"lock{stamp}@example.com"
for _ in range(5):
    call("POST", "/auth/email/verify", {"email": lock_email, "code": "111111", "confirmsEligibility": True})
s, r = call("POST", "/auth/email/verify", {"email": lock_email, "code": r["mockVerificationCode"], "confirmsEligibility": True})
check("6th attempt after 5 wrong -> 429 even with right code", s == 429, (s, r))

# existing user signs in again
time.sleep(0.1)
bob = sign_in(b_email)
b_tok = bob["token"]
check("second user created", bob["isNewAccount"] is True and bob["user"]["anonymousIdentity"]["id"] != alice["user"]["anonymousIdentity"]["id"])

# ---- assessment
s, r = call("GET", "/me/assessment", token=a_tok)
check("assessment before completing -> 204", s == 204, (s, r))
s, r = call("PUT", "/me/assessment", {"stage": "employed_and_staying", "industries": [], "priorities": ["pay_equity", "benefits", "safe_workplace", "supportive_manager"], "topics": []}, token=a_tok)
check("assessment invalid -> 422 with fieldErrors", s == 422 and {"industries", "priorities", "topics"} <= set(r["fieldErrors"]), (s, r))
good = {"stage": "employed_looking_to_switch", "industries": ["Tech"], "priorities": ["pay_equity", "parental_leave"], "topics": ["pay gap", "supportive manager"], "followedCompanyIds": []}
s, r = call("PUT", "/me/assessment", good, token=a_tok)
check("assessment saved", s == 200 and r["updatedAt"] is None and r["answers"]["stage"] == "employed_looking_to_switch", (s, r))
s, r = call("GET", "/auth/session", token=a_tok)
check("hasCompletedAssessment now true", r["hasCompletedAssessment"] is True, r)
s, r = call("PUT", "/me/assessment", {**good, "industries": ["Finance"]}, token=a_tok)
check("retake sets updatedAt", s == 200 and r["updatedAt"] is not None, (s, r))
s, r = call("GET", "/me/assessment", token=a_tok)
check("assessment readable", s == 200 and r["answers"]["industries"] == ["Finance"], (s, r))

# ---- discussions: auth + feed
s, r = call("GET", "/discussions/posts")
check("feed without token -> 401", s == 401, (s, r))
s, r = call("GET", "/discussions/posts?pageSize=5", token=a_tok)
check("feed paginated: 5 items, total 25, hasMore", s == 200 and len(r["items"]) == 5 and r["total"] == 25 and r["hasMore"] is True, (s, r and {k: r[k] for k in r if k != 'items'}))
first = r["items"][0]
check("feed post has contract shape, no user id/email", set(first) == {"id", "title", "body", "tags", "author", "isOwn", "createdAt", "editedAt", "commentCount"} and set(first["author"]) == {"id", "label", "color"} and first["isOwn"] is False, first)
s, r = call("GET", "/discussions/posts?tag=%23pay%20gap&limit=100", token=a_tok)
check("tag filter works (#pay gap)", s == 200 and r["total"] > 0 and all("pay gap" in p["tags"] for p in r["items"]), (s, r and r["total"]))
s, r = call("GET", "/discussions/posts?q=maternity", token=a_tok)
check("text search works", s == 200 and r["total"] > 0, (s, r))

# create / validate
s, r = call("POST", "/discussions/posts", {"title": "", "body": "", "tags": []}, token=a_tok)
check("create post invalid -> 422 title/body/tags", s == 422 and {"title", "body", "tags"} <= set(r["fieldErrors"]), (s, r))
s, r = call("POST", "/discussions/posts", {"title": "t", "body": "b", "tags": ["spamword city"]}, token=a_tok)
check("banned tag word rejected server-side (AC-8)", s == 422 and "tags" in r["fieldErrors"], (s, r))
s, r = call("POST", "/discussions/posts", {"title": "x" * 141, "body": "b", "tags": ["pay gap"]}, token=a_tok)
check("title over 140 chars -> 422", s == 422 and "title" in r["fieldErrors"], (s, r))
s, r = call("POST", "/discussions/posts", {"title": "My first post", "body": "Hello there", "tags": ["#Pay  Gap", "pay gap", "Test Tag"]}, token=a_tok)
check("create post ok: normalised+deduped tags, isOwn", s == 201 and r["tags"] == ["pay gap", "test tag"] and r["isOwn"] is True and r["editedAt"] is None and r["commentCount"] == 0, (s, r))
post_id = r["id"]
s, r = call("GET", f"/discussions/posts/{post_id}", token=b_tok)
check("other user sees isOwn false and same anonymous author", s == 200 and r["isOwn"] is False and r["author"]["id"] == alice["user"]["anonymousIdentity"]["id"], (s, r))

# ownership
s, r = call("PUT", f"/discussions/posts/{post_id}", {"title": "Hijack", "body": "x", "tags": ["pay gap"]}, token=b_tok)
check("edit someone else's post -> 403", s == 403 and r["code"] == "forbidden", (s, r))
s, r = call("DELETE", f"/discussions/posts/{post_id}", token=b_tok)
check("delete someone else's post -> 403", s == 403, (s, r))
s, r = call("PUT", f"/discussions/posts/{post_id}", {"title": "My first post (edited)", "body": "Hello again", "tags": ["pay gap"]}, token=a_tok)
check("edit own post sets editedAt", s == 200 and r["editedAt"] is not None and r["title"].endswith("(edited)"), (s, r))

# comments
s, r = call("POST", f"/discussions/posts/{post_id}/comments", {"body": "   "}, token=b_tok)
check("empty comment -> 422", s == 422 and "body" in r["fieldErrors"], (s, r))
s, r = call("POST", f"/discussions/posts/{post_id}/comments", {"body": "first!"}, token=b_tok)
check("comment created, isOwn for author", s == 201 and r["isOwn"] is True and r["body"] == "first!", (s, r))
c1 = r["id"]
s, r = call("POST", f"/discussions/posts/{post_id}/comments", {"body": "second"}, token=a_tok)
c2 = r["id"]
s, r = call("GET", f"/discussions/posts/{post_id}/comments", token=a_tok)
check("comments oldest first, paginated", s == 200 and [c["body"] for c in r["items"]] == ["first!", "second"] and r["total"] == 2, (s, r))
check("commentCount on post updated", call("GET", f"/discussions/posts/{post_id}", token=a_tok)[1]["commentCount"] == 2)
s, r = call("DELETE", f"/discussions/comments/{c1}", token=a_tok)
check("delete someone else's comment -> 403", s == 403, (s, r))
s, r = call("DELETE", f"/discussions/comments/{c2}", token=a_tok)
check("delete own comment -> 204", s == 204, (s, r))

# demo comment endpoint now needs auth
s, r = call("POST", "/demo/posts/post_0001/comments", {"content": "hi"})
check("demo comment without token -> 401", s == 401, (s, r))
s, r = call("POST", "/demo/posts/post_0001/comments", {"content": "  hello from the demo page  "}, token=b_tok)
check("demo comment with token -> 201, shown by anonymous label", s == 201 and r["content"] == "hello from the demo page" and r["author"]["displayName"].startswith("Anonymous"), (s, r))
s, r = call("GET", "/demo/posts/post_0001")
check("demo post commentCount includes it (7)", r["commentCount"] == 7, r["commentCount"])

# tags
s, r = call("GET", "/discussions/tags?q=pay", token=a_tok)
check("tag search returns counts", s == 200 and any(t["name"] == "pay gap" and t["postCount"] > 0 for t in r), (s, r))
s, r = call("POST", "/discussions/tags", {"name": "Brand New"}, token=a_tok)
check("create tag normalises + 201", s == 201 and r == {"name": "brand new", "postCount": 0}, (s, r))
s, r = call("POST", "/discussions/tags", {"name": "bannedexample"}, token=a_tok)
check("banned tag name -> 422", s == 422 and "name" in r["fieldErrors"], (s, r))
s, r = call("GET", "/discussions/tags?q=brand", token=a_tok)
check("created tag appears with 0 posts", any(t["name"] == "brand new" and t["postCount"] == 0 for t in r), r)

# public preview
s, r = call("GET", "/discussions/public-preview")
check("public preview needs no token: 4 groups, <=10 each, never own", s == 200 and len(r) == 4 and all(len(g["posts"]) <= 10 and all(p["isOwn"] is False for p in g["posts"]) for g in r), (s, r and [(g["tag"], len(g["posts"])) for g in r]))

# home recommendations
s, r = call("GET", "/home/recommendations", token=a_tok)
check("recommendations use assessment tags", s == 200 and "pay gap" in r["basedOnTags"] and "maternity leave" in r["basedOnTags"] and r["unseenRemaining"] == r["totalMatching"], (s, r and {k: r[k] for k in r if k != 'items'}))
before = r["unseenRemaining"]
pid = r["items"][0]["id"]
s, _ = call("POST", "/me/read-posts", {"postId": pid}, token=a_tok)
check("read-posts -> 204", s == 204)
s, r = call("GET", "/home/recommendations", token=a_tok)
check("read post leaves recommendations", r["unseenRemaining"] == before - 1 and pid not in [p["id"] for p in r["items"]], (before, r["unseenRemaining"]))
call("POST", "/me/read-posts", {"postId": "does-not-exist"}, token=a_tok)
s, _ = call("DELETE", "/me/read-posts", token=a_tok)
s, r = call("GET", "/home/recommendations", token=a_tok)
check("clearing history restores them", r["unseenRemaining"] == before, r["unseenRemaining"])
s, r = call("GET", "/home/recommendations", token=b_tok)
check("user with no assessment -> empty recommendations", s == 200 and r["basedOnTags"] == [] and r["items"] == [], (s, r))

# me
s, r = call("GET", "/me/activity", token=a_tok)
check("activity counts", s == 200 and r["postCount"] == 1 and r["commentCount"] == 1 or r["commentCount"] == 0, r)
s, r = call("GET", "/me/posts", token=a_tok)
check("my posts: one, isOwn", s == 200 and r["total"] == 1 and r["items"][0]["isOwn"] is True, (s, r))
s, r = call("GET", "/me/comments", token=b_tok)
check("my comments (bob): 2 incl. demo comment", s == 200 and r["total"] == 2, (s, r))

# delete post cascades comments
s, r = call("DELETE", f"/discussions/posts/{post_id}", token=a_tok)
check("delete own post -> 204", s == 204, (s, r))
s, r = call("GET", f"/discussions/posts/{post_id}", token=a_tok)
check("deleted post -> 404", s == 404, (s, r))
s, r = call("GET", "/me/comments", token=b_tok)
check("its comments were deleted too (bob now has 1)", r["total"] == 1, r)

# CORS for PUT/DELETE from the frontend origin
req = urllib.request.Request(BASE + "/discussions/posts/x", method="OPTIONS", headers={"Origin": "http://localhost:5173", "Access-Control-Request-Method": "DELETE", "Access-Control-Request-Headers": "authorization,content-type"})
with urllib.request.urlopen(req) as res:
    allow = res.headers.get("access-control-allow-methods", "")
check("CORS preflight allows PUT and DELETE", "PUT" in allow and "DELETE" in allow, allow)

# sign out
s, _ = call("POST", "/auth/sign-out", token=a_tok)
check("sign-out -> 204", s == 204)
s, r = call("GET", "/auth/session", token=a_tok)
check("session dead after sign-out (server-side)", s == 401, (s, r))
s, r = call("GET", "/auth/session", token=b_tok)
check("other session unaffected", s == 200, (s, r))

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
