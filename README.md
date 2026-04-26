# Task Manager

A clean, modern, editorial Task Manager web application built with Vanilla HTML, CSS, and JavaScript.

## Features
- Fully responsive, mobile-first design.
- Dark and light mode toggle with system preference detection.
- Complete task CRUD with inline editing.
- Drag-and-drop to reorder tasks.
- Advanced filtering and sorting (by tags, priority, due date, created date).
- Keyboard shortcuts for productivity (`N`, `/`, `?`, `Esc`).
- LocalStorage persistence.

## Run Locally (No build step required)

Since this app is entirely static, you can just open the `index.html` file in your browser to run it locally.
No build tools, package managers, or local servers are strictly necessary, though you can use any simple HTTP server.

```bash
# Example using Python 3
python -m http.server 8000
```

## Deploy with Docker

A `Dockerfile` is provided for running this app in an NGINX web server container.

1. Build the Docker image:
   ```bash
   docker build -t task-manager .
   ```
2. Run the Docker container:
   ```bash
   docker run -p 8080:80 task-manager
   ```
3. Visit http://localhost:8080 in your browser.

## Deploy with Vercel

The repository includes a `vercel.json` configuration for seamless deployment on Vercel.

**Option A (Vercel CLI):**
```bash
npm i -g vercel
vercel
```

**Option B (Vercel GUI):**
1. Push this code to a GitHub repository.
2. Go to vercel.com and import the repository.
3. Vercel will auto-deploy it as a static site.

## Extending the App
- **Backend/Database:** You can replace the localStorage logic in `app.js` (`saveTasks` and `loadTasks`) with Fetch API calls to an external REST or GraphQL API.
- **Authentication:** Integrate with Firebase Auth or Auth0 to add login functionalities and store user-specific data.
