
let config = null;
let editingTaskId = null;

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");
const submitButton = document.getElementById("task-submit");
const cancelButton = document.getElementById("cancel-edit");
const taskCount = document.getElementById("task-count");
const formHeading = document.getElementById("form-heading");

function showMessage(message, isError = false) {
    statusMessage.textContent = message;
    statusMessage.style.color = isError ? "#f87171" : "#4ade80";
}

async function apiRequest(endpoint, options = {}) {
    const response = await fetch(
        `${config.supabaseUrl}/rest/v1/${endpoint}`,
        {
            ...options,
            headers: {
                "apikey": config.supabasePublishableKey,
                "Authorization": `Bearer ${config.supabasePublishableKey}`,
                "Content-Type": "application/json",
                ...options.headers
            }
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || `Request failed: ${response.status}`);
    }

    if (response.status === 204) {
        return null;
    }

    return response.json();
}

async function loadTasks() {
    try {
        showMessage("Loading tasks...");

        const tasks = await apiRequest(
            `${config.tableName}?select=*&order=id.desc`
        );

        renderTasks(tasks);
        showMessage("Tasks loaded successfully.");
    } catch (error) {
        showMessage("Could not load tasks: " + error.message, true);
    }
}

function renderTasks(tasks) {
    taskList.replaceChildren();

    taskCount.textContent = `${tasks.length} task(s)`;

    if (tasks.length === 0) {
        const emptyMessage = document.createElement("p");
        emptyMessage.textContent = "No tasks yet. Create your first task!";
        taskList.appendChild(emptyMessage);
        return;
    }

    tasks.forEach(task => {
        const item = document.createElement("div");
        item.className = "task-item";
        item.dataset.id = task.id;

        const title = document.createElement("div");
        title.className = "task-title";
        title.textContent = task.title;

        const description = document.createElement("div");
        description.className = "task-description";
        description.textContent = task.description || "No description";

        const status = document.createElement("div");
        status.className = "task-status";
        status.textContent = task.completed ? "Completed" : "Pending";

        if (task.completed) {
            status.classList.add("completed");
        }

        const actions = document.createElement("div");
        actions.className = "task-actions";

        const editButton = document.createElement("button");
        editButton.className = "edit-task";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editTask(task));

        const toggleButton = document.createElement("button");
        toggleButton.className = "toggle-task";
        toggleButton.textContent = task.completed
            ? "Mark Incomplete"
            : "Mark Complete";

        toggleButton.addEventListener("click", () => toggleTask(task));

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-task";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteTask(task.id));

        actions.append(editButton, toggleButton, deleteButton);
        item.append(title, description, status, actions);
        taskList.appendChild(item);
    });
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!title) {
        showMessage("Please enter a task title.", true);
        return;
    }

    const task = {
        title,
        description,
    };

    try {
        submitButton.disabled = true;

        if (editingTaskId !== null) {
            await apiRequest(
                `${config.tableName}?id=eq.${editingTaskId}`,
                {
                    method: "PATCH",
                    body: JSON.stringify(task)
                }
            );

            showMessage("Task updated successfully.");
        } else {
            await apiRequest(config.tableName, {
                method: "POST",
                headers: {
                    "Prefer": "return=minimal"
                },
                body: JSON.stringify(task)
            });

            showMessage("Task added successfully.");
        }

        resetForm();
        await loadTasks();

    } catch (error) {
        showMessage("Could not save task: " + error.message, true);
    } finally {
        submitButton.disabled = false;
    }
});

function editTask(task) {
    editingTaskId = task.id;

    titleInput.value = task.title;
    descriptionInput.value = task.description || "";

    formHeading.textContent = "Edit Task";
    submitButton.textContent = "Save Changes";
    cancelButton.hidden = false;

    titleInput.focus();
}

function resetForm() {
    editingTaskId = null;
    form.reset();

    formHeading.textContent = "Create a New Task";
    submitButton.textContent = "Add Task";
    cancelButton.hidden = true;
}

cancelButton.addEventListener("click", resetForm);

async function toggleTask(task) {
    try {
        await apiRequest(
            `${config.tableName}?id=eq.${task.id}`,
            {
                method: "PATCH",
                body: JSON.stringify({
                    completed: !task.completed
                })
            }
        );

        showMessage("Task status updated.");
        await loadTasks();

    } catch (error) {
        showMessage("Could not update task: " + error.message, true);
    }
}

async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) {
        return;
    }

    try {
        await apiRequest(
            `${config.tableName}?id=eq.${id}`,
            { method: "DELETE" }
        );

        if (editingTaskId === id) {
            resetForm();
        }

        showMessage("Task deleted successfully.");
        await loadTasks();

    } catch (error) {
        showMessage("Could not delete task: " + error.message, true);
    }
}

async function initializeApp() {
    try {
        const response = await fetch("config.json");

        if (!response.ok) {
            throw new Error("Could not find config.json");
        }

        config = await response.json();

        if (
            !config.supabaseUrl ||
            !config.supabasePublishableKey ||
            config.tableName !== "tasks"
        ) {
            throw new Error("Invalid Supabase configuration.");
        }

        await loadTasks();

    } catch (error) {
        showMessage("Application setup error: " + error.message, true);
    }
}

initializeApp();
