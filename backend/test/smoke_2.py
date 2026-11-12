"""Smoke test 2/3: companies, privacy threshold, compare, submissions. Run on a freshly seeded DB: python3 -I test/smoke_2.py"""
import json
import os
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone

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
    return r["token"]


def sql(q):
    return subprocess.run(["docker", "exec", "ship-postgres", "psql", "-U", "ship", "-d", "ship", "-tAc", q], capture_output=True, text=True).stdout.strip()


stamp = str(int(time.time()))
ua = sign_in(f"carol{stamp}@example.com")
ub = sign_in(f"dave{stamp}@example.com")

# ---- search / list
s, r = call("GET", "/companies")
check("companies without token -> 401", s == 401, (s, r))
def all_pages(path):
    """Every item of a paginated list, so the checks hold when real companies are imported too."""
    items, page = [], 1
    while True:
        s, r = call("GET", f"{path}{'&' if '?' in path else '?'}pageSize=100&page={page}", token=ua)
        if s != 200: return s, items, None
        items += r["items"]
        if not r["hasMore"]: return s, items, r["total"]
        page += 1

s, items, total = all_pages("/companies")
demo = [c for c in items if c["isDemoFixture"]]
# The API sorts with the locale-aware String.localeCompare; str.lower matches it for the seed names,
# not for every real name ("Airbnb" vs "Air Products"), so the order is checked on the seed subset.
names = [c["name"] for c in demo]
check("list: the 18 seed companies (10 demo + 8 formal) plus any imported real ones, sorted by name, contract shape", s == 200 and len(demo) == 18 and total == len(items) and names == sorted(names, key=str.lower) and set(items[0]) == {"id", "name", "website", "industry", "headquartersCity", "isDemoFixture"}, (s, total, len(demo), names[:3]))
s, r = call("GET", "/companies?q=northwind", token=ua)
check("search 'northwind' finds Northwind Systems", s == 200 and [c["id"] for c in r["items"]] == ["northwind-systems"], (s, r))
s, items, total = all_pages("/companies?q=Tech")
# Search matches names as well as industries, so a real company named "...Technologies" may appear.
check("search by industry 'Tech'", s == 200 and sum(c["industry"] == "Tech" for c in items if c["isDemoFixture"]) >= 3 and all(c["industry"] == "Tech" or "tech" in c["name"].lower() for c in items), (s, total))
s, r = call("GET", "/companies?pageSize=5&page=2", token=ua)
check("pagination page 2: 5 items, hasMore", s == 200 and len(r["items"]) == 5 and r["page"] == 2 and r["hasMore"] is True, (s, r))

# ---- profile + privacy threshold
s, raw = call("GET", "/companies/northwind-systems", token=ua, raw=True)
p = json.loads(raw)
check("profile: company + publicData + userReported", s == 200 and set(p) == {"company", "publicData", "userReported"} and set(p["userReported"]) == {"salary", "promotion", "diversity", "benefits", "maternity"}, (s, list(p)))
check("northwind: all five areas visible (>=5 contributors)", all(p["userReported"][a]["summary"] is not None for a in p["userReported"]) and p["userReported"]["salary"]["eligibleContributors"] == 6, {a: p["userReported"][a]["eligibleContributors"] for a in p["userReported"]})
check("northwind publicData carries source + definition", p["publicData"]["salary"]["compensationDefinition"] == "base" and p["publicData"]["salary"]["source"]["reportingPeriod"] == "FY2025")
check("northwind has a comparable Senior Software Engineer cohort of >=5", any(c["role"] == "Software Engineer" and c["level"] == "Senior" and c["contributors"] >= 5 for c in p["userReported"]["salary"]["summary"]["comparableCohorts"]), p["userReported"]["salary"]["summary"]["comparableCohorts"])
check("diversity summary excludes zero team sizes, shares computed", "medianTeamWomenSharePct" in p["userReported"]["diversity"]["summary"] and "supportProgramCounts" in p["userReported"]["diversity"]["summary"])

s, raw = call("GET", "/companies/harborline-financial", token=ua, raw=True)
h = json.loads(raw)
check("harborline: salary has 4 contributors -> summary null, count shown", h["userReported"]["salary"]["eligibleContributors"] == 4 and h["userReported"]["salary"]["summary"] is None)
check("harborline: salary numbers are NOT in the response at all (AC-6)", "medianAnnualUsd" not in json.dumps(h["userReported"]["salary"]), h["userReported"]["salary"])
check("harborline: diversity (5) and benefits (5) visible exactly at the threshold", h["userReported"]["diversity"]["summary"] is not None and h["userReported"]["benefits"]["summary"] is not None)
s, v = call("GET", "/companies/vireo-consulting", token=ua)
check("vireo: salary (2) hidden, benefits (5) visible", v["userReported"]["salary"]["summary"] is None and v["userReported"]["benefits"]["summary"] is not None)
s, a = call("GET", "/companies/aster-robotics", token=ua)
check("aster: no public salary (null, not 0) but user-reported salary visible", a["publicData"]["salary"] is None and a["userReported"]["salary"]["summary"] is not None)
s, d = call("GET", "/companies/brightfern-health", token=ua)
check("demo-only company: empty public data + zero contributors (never merged)", all(v is None for v in d["publicData"].values()) and all(d["userReported"][k]["eligibleContributors"] == 0 for k in d["userReported"]), d["publicData"])
s, r = call("GET", "/companies/nope", token=ua)
check("unknown company -> 404 with friendly message", s == 404 and r["message"] == "We do not have this company yet.", (s, r))

# ---- compare
s, r = call("GET", "/companies/compare?a=northwind-systems&b=aster-robotics", token=ua)
check("compare returns both profiles", s == 200 and r["a"]["company"]["id"] == "northwind-systems" and r["b"]["company"]["id"] == "aster-robotics", (s, r and list(r)))
s, r = call("GET", "/companies/compare?a=northwind-systems&b=northwind-systems", token=ua)
check("compare same company twice -> 422", s == 422, (s, r))
s, r = call("GET", "/companies/compare?a=northwind-systems&b=nope", token=ua)
check("compare unknown -> 404", s == 404, (s, r))
check("compare needs auth", call("GET", "/companies/compare?a=x&b=y")[0] == 401)

# ---- name suggestions
s, r = call("GET", "/companies/name-suggestions?name=Northwind%20Systems%20Inc", token=ua)
check("suggestions: 'Northwind Systems Inc' -> Northwind Systems first", s == 200 and r and r[0]["company"]["id"] == "northwind-systems" and r[0]["similarity"] >= 0.9, (s, r))
s, r = call("GET", "/companies/name-suggestions?name=x", token=ua)
check("suggestions: 1 char -> []", s == 200 and r == [], (s, r))

# ---- create company
s, r = call("POST", "/companies", {"name": "", "website": "nope", "industry": "Space", "headquartersCity": ""}, token=ua)
check("create company invalid -> 422 for all four fields", s == 422 and set(r["fieldErrors"]) == {"name", "website", "industry", "headquartersCity"}, (s, r))
s, r = call("POST", "/companies", {"name": "Spamword Corp", "website": "https://spam.example", "industry": "Tech", "headquartersCity": "Austin, TX"}, token=ua)
check("banned word in company name -> 422", s == 422 and "name" in r["fieldErrors"], (s, r))
s, r = call("POST", "/companies", {"name": "Northwind Systems Ltd", "website": "https://www.northwind-systems.example/careers", "industry": "Tech", "headquartersCity": "Seattle, WA"}, token=ua)
check("duplicate website host (www. + path ignored) -> 422 naming the existing company", s == 422 and "Northwind Systems" in r["fieldErrors"]["website"][0], (s, r))
s, r = call("POST", "/companies", {"name": "Acme, Inc.", "website": "https://acme-test-" + stamp + ".example", "industry": "Tech", "headquartersCity": "Austin, TX"}, token=ua)
check("create company ok: 201, slug id, isDemoFixture false", s == 201 and r["id"] == "acme" and r["isDemoFixture"] is False, (s, r))
s, r = call("POST", "/companies", {"name": "Acme", "website": "https://acme2-test-" + stamp + ".example", "industry": "Other", "headquartersCity": "Austin, TX"}, token=ua)
check("same-slug name gets a unique id (acme-2)", s == 201 and r["id"] == "acme-2", (s, r))
s, r = call("GET", "/companies/acme", token=ua)
check("new company readable, no public data, zero contributors", s == 200 and r["userReported"]["salary"]["eligibleContributors"] == 0 and r["publicData"]["salary"] is None, (s, r))

# ---- submissions: validation
s, r = call("GET", "/companies/harborline-financial/my-submission", token=ua)
check("my-submission before any: canCreateNew", s == 200 and r == {"canCreateNew": True, "existingSubmission": None, "nextSubmissionAllowedAt": None}, (s, r))
s, r = call("POST", "/companies/harborline-financial/submissions", {}, token=ua)
check("empty submission -> 422 form error", s == 422 and "form" in r["fieldErrors"], (s, r))
s, r = call("POST", "/companies/harborline-financial/submissions", {"salary": {"role": "Analyst"}}, token=ua)
check("half-filled section rejected with dotted keys", s == 422 and {"salary.level", "salary.city", "salary.annualSalaryUsd"} <= set(r["fieldErrors"]), (s, r))
s, r = call("POST", "/companies/harborline-financial/submissions", {"promotion": {"role": "Analyst", "fromLevel": "Senior", "toLevel": "Mid", "monthsToPromotion": 12}}, token=ua)
check("promotion toLevel must be above fromLevel", s == 422 and "promotion.toLevel" in r["fieldErrors"], (s, r))
s, r = call("POST", "/companies/harborline-financial/submissions", {"diversity": {"teamSize": 4, "womenOnTeam": 9, "managerIsWoman": True, "supportPrograms": ["womens_erg"], "trustsCompanyResponse": "yes"}}, token=ua)
check("womenOnTeam cannot exceed teamSize", s == 422 and "diversity.womenOnTeam" in r["fieldErrors"], (s, r))
s, r = call("POST", "/companies/harborline-financial/submissions", {"maternity": {"paidWeeks": 12.5, "payPercent": 120}}, token=ua)
check("maternity: whole weeks, percent <= 100", s == 422 and {"maternity.paidWeeks", "maternity.payPercent"} <= set(r["fieldErrors"]), (s, r))
s, r = call("POST", "/companies/harborline-financial/submissions", {"salary": {"role": "Analyst", "level": "Mid", "city": "Chicago, IL", "annualSalaryUsd": 100000}, "hacker": {"x": 1}}, token=ua)
check("unknown section rejected", s == 422, (s, r))
s, r = call("POST", "/companies/nope/submissions", {"maternity": {"paidWeeks": 12, "payPercent": 100}}, token=ua)
check("submission to unknown company -> 404", s == 404, (s, r))
check("submission needs auth", call("POST", "/companies/harborline-financial/submissions", {})[0] == 401)

# ---- submissions: window + threshold crossing
sal = {"salary": {"role": "Analyst", "level": "Mid", "city": "Chicago, IL", "annualSalaryUsd": 100000}}
s, r = call("POST", "/companies/harborline-financial/submissions", sal, token=ua)
check("create submission -> 201", s == 201 and r["companyId"] == "harborline-financial" and r["sections"] == sal, (s, r))
sub = r
s, hp = call("GET", "/companies/harborline-financial", token=ub)
check("4th -> 5th contributor: salary summary now appears (threshold crossing)", hp["userReported"]["salary"]["eligibleContributors"] == 5 and hp["userReported"]["salary"]["summary"] is not None, hp["userReported"]["salary"])
before_median = hp["userReported"]["salary"]["summary"]["medianAnnualUsd"]
s, r = call("POST", "/companies/harborline-financial/submissions", sal, token=ua)
check("second submission inside 90 days -> 409 conflict", s == 409 and r["code"] == "conflict", (s, r))
s, r = call("GET", "/companies/harborline-financial/my-submission", token=ua)
expected_next = datetime.fromisoformat(sub["createdAt"].replace("Z", "+00:00")) + timedelta(days=90)
got_next = datetime.fromisoformat(r["nextSubmissionAllowedAt"].replace("Z", "+00:00"))
check("my-submission: cannot create new, next allowed = createdAt + 90d", r["canCreateNew"] is False and abs((got_next - expected_next).total_seconds()) < 1 and r["existingSubmission"]["id"] == sub["id"], r)

# edit
time.sleep(0.05)
edited = {"salary": {"role": "Analyst", "level": "Mid", "city": "Chicago, IL", "annualSalaryUsd": 400000}, "maternity": {"paidWeeks": 16, "payPercent": 100}}
s, r = call("PUT", f"/companies/harborline-financial/submissions/{sub['id']}", edited, token=ua)
check("edit own submission: createdAt unchanged, updatedAt moved", s == 200 and r["createdAt"] == sub["createdAt"] and r["updatedAt"] > sub["updatedAt"] and "maternity" in r["sections"], (s, r))
s, hp2 = call("GET", "/companies/harborline-financial", token=ub)
check("edit recomputes aggregates immediately", hp2["userReported"]["salary"]["summary"]["medianAnnualUsd"] != before_median, (before_median, hp2["userReported"]["salary"]["summary"]["medianAnnualUsd"]))
s, r2 = call("GET", "/companies/harborline-financial/my-submission", token=ua)
check("editing did not restart the window", r2["nextSubmissionAllowedAt"] == (expected_next.strftime("%Y-%m-%dT%H:%M:%S.") + f"{expected_next.microsecond // 1000:03d}Z"), (r2["nextSubmissionAllowedAt"], expected_next))
s, r = call("PUT", f"/companies/harborline-financial/submissions/{sub['id']}", edited, token=ub)
check("edit someone else's submission -> 404 (existence hidden)", s == 404, (s, r))
s, r = call("PUT", f"/companies/northwind-systems/submissions/{sub['id']}", edited, token=ua)
check("edit via wrong company -> 404", s == 404, (s, r))
s, r = call("PUT", f"/companies/harborline-financial/submissions/{sub['id']}", {"salary": {"role": "x"}}, token=ua)
check("edit with invalid body -> 422", s == 422, (s, r))

s, r = call("GET", "/me/submissions", token=ua)
check("/me/submissions history", s == 200 and len(r) == 1 and r[0]["companyName"] == "Harborline Financial" and sorted(r[0]["areas"]) == ["maternity", "salary"] and r[0]["isSuperseded"] is False, (s, r))
s, r = call("GET", "/me/activity", token=ua)
check("/me/activity submissionCount = 1", r["submissionCount"] == 1, r)

# supersede after the window
sql(f"UPDATE \"Submission\" SET \"createdAt\" = now() - interval '91 days' WHERE id = '{sub['id']}'")
s, r = call("GET", "/companies/harborline-financial/my-submission", token=ua)
check("after 91 days: canCreateNew true again, existing still returned", r["canCreateNew"] is True and r["existingSubmission"]["id"] == sub["id"] and r["nextSubmissionAllowedAt"] is None, r)
s, r = call("POST", "/companies/harborline-financial/submissions", {"salary": {"role": "Analyst", "level": "Senior", "city": "Chicago, IL", "annualSalaryUsd": 150000}}, token=ua)
check("new submission past the window -> 201", s == 201 and r["id"] != sub["id"], (s, r))
s, r = call("GET", "/me/submissions", token=ua)
check("old one kept as history, flagged superseded", len(r) == 2 and sorted(x["isSuperseded"] for x in r) == [False, True], r)
s, hp3 = call("GET", "/companies/harborline-financial", token=ub)
check("superseding does not double count: still 5 distinct contributors", hp3["userReported"]["salary"]["eligibleContributors"] == 5, hp3["userReported"]["salary"]["eligibleContributors"])
check("superseded maternity answer no longer counts", hp3["userReported"]["maternity"]["eligibleContributors"] == hp["userReported"]["maternity"]["eligibleContributors"])
s, r = call("PUT", f"/companies/harborline-financial/submissions/{sub['id']}", edited, token=ua)
check("editing a superseded submission -> 409", s == 409, (s, r))
s, r = call("GET", "/me/activity", token=ua)
check("submissionCount counts only the current one", r["submissionCount"] == 1, r)

# concurrency: same user, 6 parallel creates
codes = []
lock = threading.Lock()
def worker():
    s, _ = call("POST", "/companies/pinecrest-learning/submissions", {"maternity": {"paidWeeks": 10, "payPercent": 80}}, token=ub)
    with lock:
        codes.append(s)
threads = [threading.Thread(target=worker) for _ in range(6)]
[t.start() for t in threads]; [t.join() for t in threads]
check("6 parallel submissions by one user: exactly one 201, five 409", sorted(codes) == [201] + [409] * 5, sorted(codes))
check("...and exactly one active row in the database", sql(f"SELECT count(*) FROM \"Submission\" s JOIN \"User\" u ON u.id = s.\"userId\" WHERE s.\"companyId\" = 'pinecrest-learning' AND s.\"supersededAt\" IS NULL AND u.email LIKE 'dave{stamp}%'") == "1")

# demo isolation
s, r = call("GET", "/demo/companies")
# Imported real companies carry a demo profile too; the 8 formal-only fixtures must never appear.
demo_profiles = int(sql('SELECT count(*) FROM "Company" WHERE "hasDemoProfile"'))
seed_demo = int(sql('SELECT count(*) FROM "Company" WHERE "hasDemoProfile" AND "isDemoFixture"'))
check("/demo/companies lists only demo-profile records (10 demo + any imported)", s == 200 and seed_demo == 10 and r["total"] == demo_profiles, (s, r["total"], demo_profiles))
s, r = call("GET", "/demo/companies/northwind-systems")
check("/demo/companies/:id 404s for non-demo companies", s == 404, (s, r))

print(f"\n{sum(results)}/{len(results)} passed")
sys.exit(0 if all(results) else 1)
