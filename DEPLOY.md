# Putting Noctography on GitHub

A step-by-step guide, assuming you have never done this before. It takes about ten minutes.

You do not need to install anything or type any commands. Everything below happens in your
web browser.

---

## What you have

Unzip the file. You will get a folder called `site`. Inside it:

    index.html                      the landing page people find on Google
    app/                            the app itself
    assets/                         icons and your logo
    favicon.png                     the little icon in the browser tab
    noctography-link-preview.png    the image WhatsApp shows when you share the link
    support.js                      \
    noctography-engine.js            |  the code that makes it work
    noctography-sat.js               |  (do not rename these)
    pano-calculator.js              /
    robots.txt                      tells search engines they may index the site
    sitemap.xml                     lists your pages for search engines
    llms.txt                        a plain-English summary for AI search tools
    .nojekyll                       a technical file GitHub needs — leave it alone

**Important:** upload the *contents* of the `site` folder, not the folder itself. The file
`index.html` must end up at the top level of your repository, not inside a `site` folder.

---

## Step 1 — Create the repository

1. Go to **github.com** and sign in.
2. Click the **+** in the top right, then **New repository**.
3. Name it `noctography`.
4. Choose **Public**.
5. Leave every tick box unticked. Do not add a README — you already have one.
6. Click **Create repository**.

If you already have a repository for this, skip to Step 2.

---

## Step 2 — Upload the files

1. On your new repository page, click **uploading an existing file** (in the grey text near
   the top). If you do not see it, click **Add file → Upload files**.
2. Open your unzipped `site` folder on your computer.
3. Select everything *inside* it — all the files, and the `app` and `assets` folders — and
   drag them onto the GitHub page.
4. Wait for the upload to finish. Folders keep their structure automatically.
5. Scroll down, and in the box that says "Commit changes", type something like
   `First version of Noctography`.
6. Click **Commit changes**.

**One catch:** `.nojekyll` starts with a dot, so your computer may hide it. On a Mac, press
**Cmd + Shift + .** in the Finder window to show hidden files. On Windows, in File Explorer go
to **View → Show → Hidden items**. Make sure it gets uploaded — without it, GitHub ignores the
`assets` folder and your images will not appear.

---

## Step 3 — Turn on the website

1. In your repository, click **Settings** (along the top).
2. In the left-hand menu, click **Pages**.
3. Under "Build and deployment", set **Source** to **Deploy from a branch**.
4. Set **Branch** to **main** and the folder to **/ (root)**.
5. Click **Save**.

Wait two or three minutes, then refresh the page. GitHub will show a green tick and a web
address like `https://yourname.github.io/noctography/`. Click it — your landing page should
appear, and the "Get the app" button should open the app.

---

## Step 4 — Point noctography.net at it

This connects your own domain name.

**In GitHub:**

1. Still in **Settings → Pages**, find **Custom domain**.
2. Type `www.noctography.net` and click **Save**.
3. Tick **Enforce HTTPS** once it becomes available (it may take an hour or so).

**At whoever you bought noctography.net from** (GoDaddy, Namecheap, 123-reg and so on), find
the DNS settings and add these records:

| Type  | Name | Value                    |
|-------|------|--------------------------|
| CNAME | www  | `yourname.github.io`     |
| A     | @    | `185.199.108.153`        |
| A     | @    | `185.199.109.153`        |
| A     | @    | `185.199.110.153`        |
| A     | @    | `185.199.111.153`        |

Replace `yourname` with your actual GitHub username. The four A records make
`noctography.net` (without the www) work as well.

DNS changes can take anywhere from ten minutes to a few hours to take effect. Be patient
before assuming something is broken.

---

## Step 5 — Tell Google it exists

1. Go to **search.google.com/search-console** and sign in.
2. Add `https://www.noctography.net` as a property and follow the verification steps.
3. Once verified, go to **Sitemaps** in the left menu and submit `sitemap.xml`.

That tells Google about both your pages. Indexing usually takes a few days.

Then share the link somewhere once — a post, a forum, your YouTube description. Search
engines find new sites largely by following links from sites they already know about, and
your YouTube channel is the strongest one you have.

---

## Making changes later

To replace a file, click it in GitHub, click the pencil icon, paste the new contents and
commit. To replace several, use **Add file → Upload files** again and upload over the top.

Your site updates automatically a minute or two after each change. If you do not see the
change, do a hard refresh: **Cmd + Shift + R** on a Mac, **Ctrl + F5** on Windows.

### One thing to do on every release

Open `site/app/index.html` and find these three lines near the top:

```
<script src="../noctography-engine.js?v=2026-08-12"></script>
<script src="../noctography-sat.js?v=2026-08-12"></script>
```

and, further down, `s.src = '../pano-calculator.js?v=2026-08-12';`

Change all three dates to today's. That is the whole ritual.

Here is why it matters. Phones keep a copy of files they have already downloaded, and they
hold on to the JavaScript far longer than the page itself. Change the date and the address
changes with it, so the phone has no choice but to fetch the new one. Skip it and somebody can
end up running the new page against last month's calculations — which usually means a blank
screen rather than an obvious error.

### How people on their home screen get the update

They just open it. There is no app store and nothing to approve — the icon on their phone is a
shortcut to the live site, so a new build reaches everyone the next time they launch it.

The exception is iPhone. A web app left sitting in the app switcher stays in memory for days
and comes back showing whatever it was showing before. Noctography watches for this: if it has
been open more than six hours when it returns to the foreground, it offers a Refresh button at
the top of the screen. Nobody has to know why.

---

## If something does not work

**The page loads but has no styling, or images are missing.**
The `.nojekyll` file probably did not upload. See the note in Step 2.

**"Get the app" does nothing.**
Check that the `app` folder uploaded with `index.html` inside it. In GitHub you should be able
to click through: repository → `app` → `index.html`.

**404 page not found.**
Either GitHub Pages has not finished building — wait five minutes — or `index.html` is inside
a `site` folder instead of at the top level. If so, upload again, being careful to select the
contents rather than the folder.

**The WhatsApp preview shows the old image, or none.**
Go to **developers.facebook.com/tools/debug**, paste your address, and click **Scrape Again**.
WhatsApp caches previews aggressively; adding `?v=2` to the end of the link forces a fresh
look.

**The app says it cannot find your location.**
Location only works over a secure connection. Make sure **Enforce HTTPS** is ticked in
Settings → Pages, and that you are visiting the `https://` version.
