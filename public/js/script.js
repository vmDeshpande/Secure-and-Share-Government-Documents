document.addEventListener("DOMContentLoaded", async () => {
    const welcome = document.getElementById("welcome");
    if(welcome) {
      const response = await fetch("/check-auth-status");
      const data = await response.json();
    if (data.isUser === false) {
      alert("You must be logged in to access the dashboard.");
        console.error("Failed to fetch auth status");
        window.location.href = "/auth.html";
        return;
    }
    welcome.innerHTML = "";
    welcome.innerHTML = `<h2 class="text-3xl font-bold text-blue-400 mb-2">Welcome, ${data.isAuthenticated.name}</h2>`;
    }
    const logoutButton = document.getElementById("logoutButton");

        if(logoutButton) {
            logoutButton.addEventListener("click", () => {
            fetch("/logout")
                .then((response) => response.json())
                .then((data) => {
                    console.log(data.message);
                    window.location.href = "/index.html";
                })
                .catch((error) => console.error("Error:", error));
        });
    }
    if(document.getElementById('documentsTable')) loadDocuments();
toggleAuthLinks();
});

function register() {
  let registrationData;
    registrationData = {
      name: document.getElementById("Name").value,
      contact: document.getElementById("pNumber").value,
      email: document.getElementById("Email").value,
      aadhar_number: document.getElementById("aadharNumber").value,
      password: document.getElementById("Password").value,
    };

  const registrationRoute = `/register/user`;

  fetch(registrationRoute, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(registrationData),
  })
    .then((response) => response.json())
    .then((data) => {
      if (
        data.message === "User registration successful"
      ) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `user registration successful`,
          confirmButtonText: 'OK',
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = "/index.html";
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: `${data.message}`,
        })
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: `${error.message}`,
    });
    });
}

function login() {
  const loginData = {
    loginWay: document.getElementById("loginWay").value,
    password: document.getElementById("Password").value,
  };

  const loginRoute = `/login/user`;

  fetch(loginRoute, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(loginData),
  })
    .then((response) => response.json())
    .then((data) => {

      if (
        data.message === "User login successful"
      ) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: `user login successful`,
          confirmButtonText: 'OK',
        }).then((result) => {
          if (result.isConfirmed) {
            window.location.href = '/';
          }
        });
      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: `${data.message}`
        })
      }
    })
    .catch((error) => {
      console.error("Error:", error);
      Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: `${error.messsage}`,
    });
    });
}

async function toggleAuthLinks() {
  const loginLink = document.getElementById("loginLink");
  const registerLink = document.getElementById("registerLink");
  const logoutButton = document.getElementById("logoutButton");
  const dashboardButton = document.getElementById("dashboard");

  console.log("waiting for login...");
  if (await isUser()) {
    console.log("logged in as user");
    if(loginLink) loginLink.style.display = "none";
    if(registerLink) registerLink.style.display = "none";
    if(logoutButton) logoutButton.style.display = "inline";
    if(dashboardButton) dashboardButton.style.display = "inline";
  } else {
    console.log("no one logged in");
    if(loginLink) loginLink.style.display = "inline";
    if(registerLink) registerLink.style.display = "inline";
    if(logoutButton) logoutButton.style.display = "none";
    if(dashboardButton) dashboardButton.style.display = "none";
  }
}

async function isUser() {
  try {
    const response = await fetch("/check-auth-status");
    const data = await response.json();

    if(data.isUser) console.log(`Welcome ${data.isAuthenticated.name}`);
    return data.isUser || false;
  } catch (error) {
    console.error("Error checking login status:", error);
    return false;
  }
}

// Upload file
async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('document', file);

  try {
    const res = await fetch('/upload', {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    if (res.ok) {
      alert('File uploaded successfully!');
      window.location.href = '/dashboard.html';
      renderDocumentRow(data.doc);
    } else {
      alert('Upload failed: ' + data.message);
    }
  } catch (err) {
    console.error(err);
    alert('Server error: ' + err.message);
  }
}

// Fetch user documents from server and render dashboard table
async function loadDocuments() {
  try {
    const res = await fetch('/user/documents'); // create this route in server.js to return user.documents
    if (!res.ok) throw new Error('Failed to fetch documents');

    const data = await res.json(); // { documents: [...] }
    const table = document.getElementById('documentsTable');
    table.innerHTML = ''; // clear existing rows

    data.documents.forEach(doc => renderDocumentRow(doc));
  } catch (err) {
    console.error(err);
    alert('Error loading documents');
  }
}

// Render a single document row
function renderDocumentRow(doc) {
  const table = document.getElementById('documentsTable');
  const tr = document.createElement('tr');
  tr.classList.add('border-b', 'border-gray-700', 'hover:bg-gray-700', 'transition');

  const name = doc.name || 'Unnamed File';
  const mimeType = doc.fileType || 'Unknown';
  const date = doc.uploadDate ? new Date(doc.uploadDate).toLocaleDateString() : '—';
  const subDocId = doc._id; // subdocument _id
  const fileId = doc.file;  // GridFS file ObjectId

  // --- Clean file type display ---
  let displayType = '';
  if (mimeType.startsWith('image/')) displayType = mimeType.split('/')[1];
  else if (mimeType.startsWith('text/')) displayType = mimeType.split('/')[1];
  else if (mimeType === 'application/pdf') displayType = 'pdf';
  else if (mimeType.includes('officedocument')) {
    if (mimeType.includes('word')) displayType = 'docx';
    else if (mimeType.includes('excel')) displayType = 'xlsx';
    else if (mimeType.includes('presentation')) displayType = 'pptx';
    else displayType = 'office';
  } else if (mimeType.includes('msword')) displayType = 'doc';
  else if (mimeType.includes('ms-excel')) displayType = 'xls';
  else if (mimeType.includes('ms-powerpoint')) displayType = 'ppt';
  else displayType = mimeType;

  // Only show "View" button for previewable types
  const previewable = mimeType.startsWith('image/') ||
                      mimeType === 'application/pdf' ||
                      mimeType.startsWith('text/') ||
                      mimeType.startsWith('video/') ||
                      mimeType.startsWith('audio/');

  tr.innerHTML = `
    <td class="px-6 py-3">${name}</td>
    <td class="px-6 py-3">${displayType}</td>
    <td class="px-6 py-3">${date}</td>
    <td class="px-6 py-3 flex gap-2">
      ${previewable ? `<button data-file-id="${fileId}" data-type="${mimeType}" data-name="${name}"
        class="view-btn px-3 py-1 bg-blue-600 hover:bg-blue-700 rounded-md text-sm flex items-center gap-1">
        <i class="fa-solid fa-eye"></i> View
      </button>` : ''}

      <a href="/file/${fileId}" download="${name}" 
        class="px-3 py-1 bg-green-600 hover:bg-green-700 rounded-md text-sm flex items-center gap-1">
        <i class="fa-solid fa-download"></i> Download
      </a>

      <button class="delete-btn px-3 py-1 bg-red-600 hover:bg-red-700 rounded-md text-sm flex items-center gap-1"
    data-doc-id="${subDocId}">
    <i class="fa-solid fa-trash"></i> Delete
</button>
    </td>
  `;

  table.appendChild(tr);
}


document.addEventListener('click', (e) => {
  const btn = e.target.closest('.view-btn');
  if (!btn) return;

  const fileId = btn.dataset.fileId;
  const fileType = btn.dataset.type;
  const fileName = btn.dataset.name;
  const fileUrl = `${window.location.origin}/file/${fileId}`;

  let contentHTML = '';

  // --- 1️⃣ IMAGE FILES ---
  if (fileType.startsWith('image/')) {
    contentHTML = `<img src="${fileUrl}" class="max-h-[80vh] rounded-lg">`;
  } 

  // --- 2️⃣ PDF FILES ---
  else if (fileType === 'application/pdf') {
    contentHTML = `<iframe src="${fileUrl}" class="w-full h-[80vh] rounded-lg" frameborder="0"></iframe>`;
  } 

  // --- 3️⃣ OFFICE DOCUMENTS (Word, Excel, PowerPoint) ---
  else if (
    fileType.includes('officedocument') ||
    fileType.includes('msword') ||
    fileType.includes('ms-powerpoint') ||
    fileType.includes('ms-excel')
  ) {
    // Try Office Online Viewer first
    const officeViewer = `https://view.officeapps.live.com/op/view.aspx?src=${encodeURIComponent(fileUrl)}`;
    contentHTML = `<iframe src="${officeViewer}" class="w-full h-[80vh] rounded-lg" frameborder="0"></iframe>
      <p class="text-center text-gray-400 mt-3 text-sm">If it doesn’t load, try <a href="https://docs.google.com/gview?url=${encodeURIComponent(fileUrl)}&embedded=true" target="_blank" class="text-blue-400 underline">Google Docs Viewer</a>.</p>`;
  } 

  // --- 4️⃣ TEXT / VIDEO / AUDIO ---
  else if (fileType.startsWith('text/')) {
    contentHTML = `<iframe src="${fileUrl}" class="w-full h-[80vh] rounded-lg" frameborder="0"></iframe>`;
  } 
  else if (fileType.startsWith('video/')) {
    contentHTML = `<video src="${fileUrl}" controls class="max-h-[80vh] rounded-lg"></video>`;
  } 
  else if (fileType.startsWith('audio/')) {
    contentHTML = `<audio src="${fileUrl}" controls class="w-full"></audio>`;
  } 

  // --- 5️⃣ FALLBACK FOR UNKNOWN TYPES ---
  else {
    contentHTML = `
      <div class="text-center space-y-4">
        <p class="text-gray-300 text-lg">Preview not supported for this file type.</p>
        <a href="${fileUrl}" target="_blank" 
           class="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md inline-block">
           Download ${fileName}
        </a>
      </div>
    `;
  }

  // --- Modal Creation ---
  const modal = document.createElement('div');
  modal.classList.add(
    'fixed', 'inset-0', 'bg-black', 'bg-opacity-80',
    'flex', 'items-center', 'justify-center', 'z-50'
  );
  modal.innerHTML = `
    <div class="bg-gray-900 p-4 rounded-lg relative w-[80%] max-w-5xl shadow-lg">
      <button class="close-modal absolute top-2 right-2 text-gray-400 hover:text-white">
        <i class="fa-solid fa-xmark text-xl"></i>
      </button>
      <div class="content flex justify-center items-center">
        ${contentHTML}
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  // Close modal events
  modal.querySelector('.close-modal').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (evt) => {
    if (evt.target === modal) modal.remove();
  });
});

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('.delete-btn');
  if (!btn) return;

  const subDocId = btn.dataset.docId;
  if (!subDocId) return;

  try {
    const res = await fetch(`/document/${subDocId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok) {
      btn.closest('tr').remove(); // remove row from table
      console.log('Deleted:', data);
    } else {
      console.error('Delete failed:', data.message);
    }
  } catch (err) {
    console.error(err);
  }
});








// Handle file input
const fileInput = document.getElementById('fileInput');
if(fileInput) {
  fileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (file) uploadDocument(file);
});
}