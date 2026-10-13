
const API_BASE = "REPLACE_WITH_YOUR_API_GATEWAY_URL";

const form = document.querySelector("#user-form");
const userIdInput = document.querySelector("#user-id");
const usernameInput = document.querySelector("#username");
const emailInput = document.querySelector("#email");
const usersBody = document.querySelector("#users-body");
const message = document.querySelector("#message");
const saveButton = document.querySelector("#save-button");
const cancelButton = document.querySelector("#cancel-button");

let editingId = null;

async function apiRequest(path, options = {}) {
  if (API_BASE.startsWith("REPLACE_")) {
    throw new Error("The backend API has not been configured yet.");
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(detail || `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;

  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

function showMessage(text, isError = false) {
  message.textContent = text;
  message.style.color = isError ? "#c73535" : "#187443";
}

function makeCell(value) {
  const cell = document.createElement("td");
  cell.textContent = value ?? "";
  return cell;
}

function makeButton(label, className, onClick) {
  const button = document.createElement("button");
  button.type = "button";
  button.textContent = label;
  button.className = className;
  button.addEventListener("click", onClick);
  return button;
}

async function loadUsers() {
  usersBody.replaceChildren();
  const loadingRow = usersBody.insertRow();
  loadingRow.insertCell().textContent = "Loading users...";
  loadingRow.cells[0].colSpan = 4;

  try {
    const result = await apiRequest("/users");
    const users = Array.isArray(result) ? result : result?.users;

    if (!Array.isArray(users)) {
      throw new Error("Unexpected response from the API.");
    }

    usersBody.replaceChildren();

    if (users.length === 0) {
      const row = usersBody.insertRow();
      row.insertCell().textContent = "No users found.";
      row.cells[0].colSpan = 4;
      return;
    }

    for (const user of users) {
      const row = usersBody.insertRow();
      row.append(
        makeCell(user.user_id),
        makeCell(user.username),
        makeCell(user.email)
      );

      const actionsCell = row.insertCell();
      actionsCell.className = "row-actions";

      actionsCell.append(
        makeButton("Edit", "secondary", () => startEdit(user)),
        makeButton("Delete", "danger", () => deleteUser(user.user_id))
      );
    }
  } catch (error) {
    usersBody.replaceChildren();
    const row = usersBody.insertRow();
    row.insertCell().textContent = "Could not load users.";
    row.cells[0].colSpan = 4;
    showMessage(error.message, true);
  }
}

function startEdit(user) {
  editingId = user.user_id;
  userIdInput.value = user.user_id;
  userIdInput.disabled = true;
  usernameInput.value = user.username;
  emailInput.value = user.email;

  document.querySelector("#form-title").textContent = "Edit User";
  saveButton.textContent = "Save Changes";
  cancelButton.hidden = false;
  showMessage(`Editing user ${user.user_id}`);
}

function resetForm() {
  editingId = null;
  form.reset();
  userIdInput.disabled = false;
  document.querySelector("#form-title").textContent = "Add User";
  saveButton.textContent = "Add User";
  cancelButton.hidden = true;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  saveButton.disabled = true;

  const user = {
    user_id: Number(userIdInput.value),
    username: usernameInput.value.trim(),
    email: emailInput.value.trim()
  };

  try {
    if (!Number.isSafeInteger(user.user_id) || user.user_id < 1) {
      throw new Error("User ID must be a positive whole number.");
    }

    if (!user.username || !user.email) {
      throw new Error("Username and email are required.");
    }

    const path = editingId === null
      ? "/users"
      : `/users/${encodeURIComponent(editingId)}`;

    await apiRequest(path, {
      method: editingId === null ? "POST" : "PUT",
      body: JSON.stringify({
        username: user.username,
        email: user.email,
        ...(editingId === null ? { user_id: user.user_id } : {})
      })
    });

    showMessage(editingId === null ? "User added." : "User updated.");
    resetForm();
    await loadUsers();
  } catch (error) {
    showMessage(error.message, true);
  } finally {
    saveButton.disabled = false;
  }
});

async function deleteUser(id) {
  if (!confirm(`Delete user ${id}? This cannot be undone.`)) return;

  try {
    await apiRequest(`/users/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });

    showMessage(`User ${id} deleted.`);
    if (editingId === id) resetForm();
    await loadUsers();
  } catch (error) {
    showMessage(error.message, true);
  }
}

cancelButton.addEventListener("click", () => {
  resetForm();
  showMessage("Edit cancelled.");
});

document.querySelector("#refresh-button")
  .addEventListener("click", loadUsers);

loadUsers();
