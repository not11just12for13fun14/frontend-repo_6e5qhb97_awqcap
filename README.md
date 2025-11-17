This project has been permanently removed.

- Frontend: Replaced with a minimal page stating the app is deleted.
- Backend: All routes return HTTP 410 Gone. On startup, the service attempts to drop known MongoDB collections (user, videojob, project).

If you need to restore functionality, revert to a previous commit or recreate the project from scratch.
