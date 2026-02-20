document.addEventListener('DOMContentLoaded', () => {
    const todoInput = document.getElementById('todo-input');
    const addBtn = document.getElementById('add-btn');
    const todoList = document.getElementById('todo-list');

    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];

    const saveTasks = () => {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    };

    const renderTasks = () => {
        todoList.innerHTML = '';
        tasks.forEach((task, index) => {
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${task.text}</span>
                <div class="btn-group">
                    <button class="edit-btn" onclick="editTask(${index})">Edit</button>
                    <button class="delete-btn" onclick="deleteTask(${index})">Delete</button>
                </div>
            `;
            todoList.appendChild(li);
        });
    };

    const addTask = () => {
        const text = todoInput.value.trim();
        if (text) {
            tasks.push({ text, completed: false });
            saveTasks();
            renderTasks();
            todoInput.value = '';
        }
    };

    window.deleteTask = (index) => {
        tasks.splice(index, 1);
        saveTasks();
        renderTasks();
    };

    window.editTask = (index) => {
        const newText = prompt('Edit task:', tasks[index].text);
        if (newText !== null && newText.trim() !== '') {
            tasks[index].text = newText.trim();
            saveTasks();
            renderTasks();
        }
    };

    addBtn.addEventListener('click', addTask);
    todoInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') addTask();
    });

    renderTasks();
});