# Upload, v3.0.11

Commit these to the top level of the GitHub repository, over the top of 3.0.10, keeping app and scout
as folders:

    app/index.html, app/desktop.html, scout/index.html
    noctography-ar.js, noctography-phonecheck.js
    sw.js

More shows "Version 3.0.11" once it is live. There is no release notice.

## What is in 3.0.11

- Live on Android: the picture no longer swings between far too tight and right. Samsung reports the
  old zoom for a while after a change; the app read that as "not zoomed" and enlarged the picture
  on top of a camera that already had. A camera that has once done what it was asked is now
  believed, and an unchanged zoom is not sent again.
- Live knows which camera actually opened, from the camera itself rather than from what it asked
  for, so a fallback to the main lens is no longer drawn as an ultra wide.
- A camera still being released is asked for again after a pause rather than given up on, Android
  gets longer to let go, and a camera that will not open is not retried on every zoom.
- Phone check: how long the zoom takes to report, and each rear camera opened in turn.
