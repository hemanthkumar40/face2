# Face Recognition Login System (FACELOCK)

A passwordless full-stack authentication application using deep-neural biometric verification. Users register using their webcam, and can subsequently sign in using only face recognition.

---

## 🚀 Quick Links
- **[Installation & Setup Guide](file:///c:/Users/HP/OneDrive/Attachments/Desktop/Face/docs/installation_guide.md)**
- **[Project Architecture](file:///c:/Users/HP/OneDrive/Attachments/Desktop/Face/docs/project_architecture.md)**
- **[API Documentation](file:///c:/Users/HP/OneDrive/Attachments/Desktop/Face/docs/api_documentation.md)**
- **[Environment Variables](file:///c:/Users/HP/OneDrive/Attachments/Desktop/Face/docs/environment_variables.md)**
- **[Sequence Diagrams](file:///c:/Users/HP/OneDrive/Attachments/Desktop/Face/docs/sequence_diagram.md)**
- **[Directory Structure Details](file:///c:/Users/HP/OneDrive/Attachments/Desktop/Face/docs/folder_explanation.md)**

---

## 🛠 Tech Stack

- **Frontend**: React, TypeScript, Vite, React Router, Axios, Lucide Icons, Vanilla CSS
- **Backend Server**: Node.js, Express, TypeScript, Prisma ORM, JWT Authentication
- **AI Microservice**: Python, FastAPI, FaceNet-PyTorch (`InceptionResnetV1`), MTCNN, OpenCV, NumPy
- **Database**: MySQL

---

## ⚡ Core Feature Flows

### 1. Face Registration
1. User enters Name and Email.
2. Web camera streams inside the browser.
3. User captures **5 distinct face angles**.
4. The backend calls the Python AI service to generate a **512-dimensional face embedding** for each scan.
5. Only the embeddings are written to MySQL. Raw images are **never stored**.

### 2. Face Login (1:N Identification)
1. User opens the login page and grants camera permission.
2. User captures a live scan.
3. The backend generates the embedding and pulls all candidate vectors from MySQL.
4. Python compares vectors using **Cosine Similarity**.
5. If the highest match exceeds the similarity threshold (`0.72`), the system logs the matching user in, signs a JWT session cookie, and redirects them to the profile Dashboard.

---

## 🎨 Design Philosophy
The user interface follows a strict **monochrome Swiss-design layout**:
- Uses exclusively **black, white, and grays** (no bright colors or background gradients).
- Focuses heavily on whitespace, high contrast, clean typography, and thin outlines.
- Subtle transitions and responsive structures for mobile and desktop screens.
- Standard CSS variables support instant toggling between **Light Mode** and **Dark Mode**.

---

## 🛡 Security Practices
- **No Raw Image Storage**: Face images are parsed directly into numpy matrices and cleared immediately.
- **Protected APIs**: Profile endpoints require valid JWT headers (`Authorization: Bearer <token>`).
- **No Client-Side Embeddings**: Sensitive vectors are calculated and compared purely within server gateways and microservices.
- **Relational Integrity**: Deleting a user accounts cascades and purges all their face embedding entries automatically.
