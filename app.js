/**
 * Task Manager Application
 * Vanilla JS Implementation
 */

// ==========================================
// STATE MANAGEMENT
// ==========================================
let tasks = [];
let filters = {
    status: 'all', // all, active, completed
    priority: 'all', // all, high, medium, low
    tag: 'all',
    search: ''
};
let sortBy = 'created-desc';
let draggedTaskIndex = null;
let recentlyDeletedTask = null;
let recentlyDeletedIndex = null;

// ==========================================
// DOM ELEMENTS
// ==========================================
const DOM = {
    themeToggle: document.getElementById('theme-toggle'),
    iconMoon: document.querySelector('.icon-moon'),
    iconSun: document.querySelector('.icon-sun'),
    
    taskForm: document.getElementById('task-form'),
    taskInput: document.getElementById('new-task-input'),
    charCounter: document.getElementById('char-counter'),
    priorityInput: document.getElementById('task-priority'),
    dueDateInput: document.getElementById('task-due-date'),
    tagsInput: document.getElementById('task-tags'),
    
    searchInput: document.getElementById('search-input'),
    sortSelect: document.getElementById('sort-select'),
    filterTabs: document.querySelectorAll('.filter-tabs button'),
    priorityFilters: document.querySelectorAll('.filter-chip[data-priority]'),
    dynamicTagFilters: document.getElementById('dynamic-tag-filters'),
    
    taskList: document.getElementById('task-list'),
    skeletonList: document.getElementById('skeleton-list'),
    emptyState: document.getElementById('empty-state'),
    
    progressText: document.getElementById('progress-text'),
    progressPercentage: document.getElementById('progress-percentage'),
    progressBar: document.getElementById('progress-bar'),
    
    statTotal: document.getElementById('stat-total'),
    statActive: document.getElementById('stat-active'),
    statCompleted: document.getElementById('stat-completed'),
    statOverdue: document.getElementById('stat-overdue'),
    
    toggleAllBtn: document.getElementById('toggle-all-btn'),
    clearCompletedBtn: document.getElementById('clear-completed-btn'),
    
    toastContainer: document.getElementById('toast-container'),
    shortcutsModal: document.getElementById('shortcuts-modal'),
    closeModalBtn: document.getElementById('close-modal-btn')
};

// ==========================================
// INITIALIZATION
// ==========================================
function init() {
    initTheme();
    loadTasks();
    setupEventListeners();
    
    // Hide skeleton after initial "load"
    setTimeout(() => {
        DOM.skeletonList.style.display = 'none';
        DOM.taskList.style.display = 'flex';
        render();
    }, 500);
}

// ==========================================
// THEME HANDLING
// ==========================================
function initTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(savedTheme);
    } else {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        updateThemeIcon(prefersDark ? 'dark' : 'light');
    }
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let newTheme = 'light';
    
    if (currentTheme === 'light' || (!currentTheme && !window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        newTheme = 'dark';
    }
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    if (theme === 'dark') {
        DOM.iconMoon.style.display = 'none';
        DOM.iconSun.style.display = 'block';
    } else {
        DOM.iconMoon.style.display = 'block';
        DOM.iconSun.style.display = 'none';
    }
}

// ==========================================
// LOCAL STORAGE
// ==========================================
function saveTasks() {
    try {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    } catch (e) {
        showToast('Error saving tasks to local storage', 'error');
    }
}

function loadTasks() {
    try {
        const saved = localStorage.getItem('tasks');
        if (saved) {
            tasks = JSON.stringify(saved) ? JSON.parse(saved) : [];
        }
    } catch (e) {
        showToast('Error loading tasks', 'error');
        tasks = [];
    }
}

// ==========================================
// EVENT LISTENERS
// ==========================================
function setupEventListeners() {
    DOM.themeToggle.addEventListener('click', toggleTheme);
    
    // Add Task
    DOM.taskForm.addEventListener('submit', handleAddTask);
    DOM.taskInput.addEventListener('input', handleInputValidation);
    
    // Filters & Sort
    DOM.searchInput.addEventListener('input', debounce(handleSearch, 150));
    DOM.sortSelect.addEventListener('change', handleSort);
    
    DOM.filterTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            DOM.filterTabs.forEach(t => {
                t.classList.remove('active');
                t.setAttribute('aria-selected', 'false');
            });
            tab.classList.add('active');
            tab.setAttribute('aria-selected', 'true');
            filters.status = tab.dataset.filter;
            render();
        });
    });
    
    DOM.priorityFilters.forEach(chip => {
        chip.addEventListener('click', () => {
            DOM.priorityFilters.forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            filters.priority = chip.dataset.priority;
            render();
        });
    });
    
    // Bulk Actions
    DOM.toggleAllBtn.addEventListener('click', handleToggleAll);
    DOM.clearCompletedBtn.addEventListener('click', handleClearCompleted);
    
    // Keyboard Shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
    DOM.closeModalBtn.addEventListener('click', () => DOM.shortcutsModal.close());
    DOM.shortcutsModal.addEventListener('click', (e) => {
        if (e.target === DOM.shortcutsModal) DOM.shortcutsModal.close();
    });
}

// ==========================================
// CORE LOGIC
// ==========================================
function handleAddTask(e) {
    e.preventDefault();
    const title = DOM.taskInput.value.trim();
    
    if (!title) {
        DOM.taskForm.classList.add('shake');
        setTimeout(() => DOM.taskForm.classList.remove('shake'), 400);
        return;
    }
    
    const priority = DOM.priorityInput.value;
    const dueDate = DOM.dueDateInput.value;
    const tagsString = DOM.tagsInput.value;
    
    const tags = tagsString.split(',').map(t => t.trim().toLowerCase()).filter(t => t);
    
    const newTask = {
        id: Date.now().toString(),
        title,
        priority,
        dueDate: dueDate || null,
        tags,
        completed: false,
        createdAt: new Date().toISOString()
    };
    
    tasks.unshift(newTask);
    saveTasks();
    
    // Reset form
    DOM.taskForm.reset();
    DOM.priorityInput.value = 'medium'; // reset to default
    handleInputValidation(); // reset counter
    DOM.taskInput.focus();
    
    showToast('Task added successfully', 'success');
    render();
}

function handleInputValidation() {
    const val = DOM.taskInput.value;
    const remaining = 200 - val.length;
    DOM.charCounter.textContent = remaining;
    
    if (remaining < 20) {
        DOM.charCounter.classList.add('error');
    } else {
        DOM.charCounter.classList.remove('error');
    }
}

function toggleTaskStatus(id) {
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.completed = !task.completed;
        saveTasks();
        render();
    }
}

function deleteTask(id) {
    const index = tasks.findIndex(t => t.id === id);
    if (index !== -1) {
        recentlyDeletedTask = tasks[index];
        recentlyDeletedIndex = index;
        
        tasks.splice(index, 1);
        saveTasks();
        
        // Find DOM element and animate out
        const el = document.getElementById(`task-${id}`);
        if (el) {
            el.style.animation = 'slideOut 300ms ease forwards';
            setTimeout(render, 300);
        } else {
            render();
        }
        
        showUndoToast();
    }
}

function startInlineEdit(id) {
    const task = tasks.find(t => t.id === id);
    if (!task || task.completed) return;
    
    const el = document.getElementById(`task-${id}`);
    const titleEl = el.querySelector('.task-title');
    const input = document.createElement('input');
    
    input.type = 'text';
    input.value = task.title;
    input.className = 'task-edit-input';
    input.maxLength = 200;
    
    titleEl.replaceWith(input);
    input.focus();
    
    const saveEdit = () => {
        const newTitle = input.value.trim();
        if (newTitle) {
            task.title = newTitle;
            saveTasks();
        }
        render();
    };
    
    input.addEventListener('blur', saveEdit);
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            input.blur();
        } else if (e.key === 'Escape') {
            input.removeEventListener('blur', saveEdit);
            render(); // abort
        }
    });
}

function handleToggleAll() {
    const allCompleted = tasks.length > 0 && tasks.every(t => t.completed);
    tasks.forEach(t => t.completed = !allCompleted);
    saveTasks();
    render();
}

function handleClearCompleted() {
    tasks = tasks.filter(t => !t.completed);
    saveTasks();
    render();
    showToast('Completed tasks cleared', 'success');
}

function showUndoToast() {
    const toast = document.createElement('div');
    toast.className = 'toast undo';
    toast.innerHTML = `
        <span>Task deleted</span>
        <button class="btn-undo">Undo</button>
    `;
    
    const undoBtn = toast.querySelector('.btn-undo');
    let timeout;
    
    const removeToast = () => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    };
    
    undoBtn.addEventListener('click', () => {
        if (recentlyDeletedTask) {
            tasks.splice(recentlyDeletedIndex, 0, recentlyDeletedTask);
            saveTasks();
            render();
            recentlyDeletedTask = null;
            removeToast();
        }
    });
    
    DOM.toastContainer.appendChild(toast);
    timeout = setTimeout(removeToast, 5000);
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    DOM.toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.add('hiding');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// ==========================================
// DRAG AND DROP
// ==========================================
function handleDragStart(e, index) {
    draggedTaskIndex = index;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const item = e.target.closest('.task-item');
    if (item && !item.classList.contains('dragging')) {
        item.classList.add('drag-over');
    }
}

function handleDragLeave(e) {
    const item = e.target.closest('.task-item');
    if (item) {
        item.classList.remove('drag-over');
    }
}

function handleDrop(e, targetIndex) {
    e.preventDefault();
    const item = e.target.closest('.task-item');
    if (item) {
        item.classList.remove('drag-over');
    }
    
    if (draggedTaskIndex === null || draggedTaskIndex === targetIndex) return;
    
    const [draggedTask] = tasks.splice(draggedTaskIndex, 1);
    tasks.splice(targetIndex, 0, draggedTask);
    saveTasks();
    render();
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
    draggedTaskIndex = null;
}

// ==========================================
// FILTERING & SORTING
// ==========================================
function handleSearch(e) {
    filters.search = e.target.value.toLowerCase();
    render();
}

function handleSort(e) {
    sortBy = e.target.value;
    render();
}

function getFilteredAndSortedTasks() {
    let result = tasks.filter(task => {
        // Status filter
        if (filters.status === 'active' && task.completed) return false;
        if (filters.status === 'completed' && !task.completed) return false;
        
        // Priority filter
        if (filters.priority !== 'all' && task.priority !== filters.priority) return false;
        
        // Tag filter
        if (filters.tag !== 'all' && !task.tags.includes(filters.tag)) return false;
        
        // Search filter
        if (filters.search && !task.title.toLowerCase().includes(filters.search)) return false;
        
        return true;
    });
    
    // Sorting
    result.sort((a, b) => {
        switch (sortBy) {
            case 'created-desc':
                return new Date(b.createdAt) - new Date(a.createdAt);
            case 'created-asc':
                return new Date(a.createdAt) - new Date(b.createdAt);
            case 'due-asc':
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(a.dueDate) - new Date(b.dueDate);
            case 'due-desc':
                if (!a.dueDate) return 1;
                if (!b.dueDate) return -1;
                return new Date(b.dueDate) - new Date(a.dueDate);
            case 'priority-desc':
            case 'priority-asc':
                const p = { high: 3, medium: 2, low: 1 };
                const diff = p[b.priority] - p[a.priority];
                return sortBy === 'priority-desc' ? diff : -diff;
            case 'alpha-asc':
                return a.title.localeCompare(b.title);
            case 'alpha-desc':
                return b.title.localeCompare(a.title);
            default:
                return 0;
        }
    });
    
    return result;
}

// ==========================================
// RENDER & UI UPDATES
// ==========================================
function render() {
    const displayTasks = getFilteredAndSortedTasks();
    DOM.taskList.innerHTML = '';
    
    if (displayTasks.length === 0) {
        DOM.taskList.style.display = 'none';
        DOM.emptyState.style.display = 'block';
    } else {
        DOM.taskList.style.display = 'flex';
        DOM.emptyState.style.display = 'none';
        
        displayTasks.forEach((task, idx) => {
            // Find original index for DnD
            const originalIndex = tasks.findIndex(t => t.id === task.id);
            DOM.taskList.appendChild(createTaskElement(task, originalIndex));
        });
    }
    
    updateStats();
    updateTagFilters();
}

function createTaskElement(task, index) {
    const li = document.createElement('li');
    li.className = `task-item ${task.completed ? 'completed' : ''}`;
    li.id = `task-${task.id}`;
    li.draggable = true;
    
    // DnD Listeners
    li.addEventListener('dragstart', (e) => handleDragStart(e, index));
    li.addEventListener('dragover', handleDragOver);
    li.addEventListener('dragleave', handleDragLeave);
    li.addEventListener('drop', (e) => handleDrop(e, index));
    li.addEventListener('dragend', handleDragEnd);
    
    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date(new Date().setHours(0,0,0,0)) && !task.completed;
    const isDueToday = task.dueDate && new Date(task.dueDate).toDateString() === new Date().toDateString() && !task.completed;
    
    let dueClass = '';
    if (isOverdue) dueClass = 'overdue';
    else if (isDueToday) dueClass = 'due-today';
    
    const dueText = task.dueDate ? `<span class="due-date ${dueClass}">📅 ${formatDate(task.dueDate)}</span>` : '';
    
    const tagsHtml = task.tags.map(t => `<span class="task-tag">#${t}</span>`).join('');
    
    li.innerHTML = `
        <div class="task-checkbox-container">
            <input type="checkbox" class="task-checkbox" aria-label="Mark task complete" ${task.completed ? 'checked' : ''}>
        </div>
        <div class="task-content">
            <div class="task-title">${escapeHTML(task.title)}</div>
            <div class="task-details">
                <span class="badge badge-priority-${task.priority}">${task.priority}</span>
                ${dueText}
                ${tagsHtml}
                <span title="${new Date(task.createdAt).toLocaleString()}">⏱ ${timeAgo(new Date(task.createdAt))}</span>
            </div>
        </div>
        <div class="task-actions">
            <button class="icon-button btn-delete" aria-label="Delete task">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
            </button>
        </div>
    `;
    
    // Listeners
    li.querySelector('.task-checkbox').addEventListener('change', () => toggleTaskStatus(task.id));
    li.querySelector('.btn-delete').addEventListener('click', () => deleteTask(task.id));
    li.querySelector('.task-content').addEventListener('dblclick', () => startInlineEdit(task.id));
    
    return li;
}

function updateStats() {
    const total = tasks.length;
    const completed = tasks.filter(t => t.completed).length;
    const active = total - completed;
    
    // Check overdue
    const today = new Date(new Date().setHours(0,0,0,0));
    const overdue = tasks.filter(t => !t.completed && t.dueDate && new Date(t.dueDate) < today).length;
    
    DOM.statTotal.textContent = total;
    DOM.statActive.textContent = active;
    DOM.statCompleted.textContent = completed;
    DOM.statOverdue.textContent = overdue;
    
    const percentage = total === 0 ? 0 : Math.round((completed / total) * 100);
    DOM.progressText.textContent = `${completed} of ${total} tasks completed`;
    DOM.progressPercentage.textContent = `${percentage}%`;
    DOM.progressBar.style.width = `${percentage}%`;
    DOM.progressBar.setAttribute('aria-valuenow', percentage);
    
    if (completed > 0) {
        DOM.clearCompletedBtn.style.display = 'inline-block';
    } else {
        DOM.clearCompletedBtn.style.display = 'none';
    }
    
    if (total > 0) {
        DOM.toggleAllBtn.style.display = 'inline-block';
        DOM.toggleAllBtn.textContent = (completed === total) ? 'Undo Complete All' : 'Complete All';
    } else {
        DOM.toggleAllBtn.style.display = 'none';
    }
}

function updateTagFilters() {
    // Collect unique tags
    const allTags = new Set();
    tasks.forEach(t => t.tags.forEach(tag => allTags.add(tag)));
    
    DOM.dynamicTagFilters.innerHTML = '';
    
    if (allTags.size > 0) {
        const clearBtn = document.createElement('button');
        clearBtn.className = `filter-chip ${filters.tag === 'all' ? 'active' : ''}`;
        clearBtn.textContent = 'All Tags';
        clearBtn.addEventListener('click', () => {
            filters.tag = 'all';
            render();
        });
        DOM.dynamicTagFilters.appendChild(clearBtn);
        
        allTags.forEach(tag => {
            const btn = document.createElement('button');
            btn.className = `filter-chip ${filters.tag === tag ? 'active' : ''}`;
            btn.textContent = `#${tag}`;
            btn.addEventListener('click', () => {
                filters.tag = tag;
                render();
            });
            DOM.dynamicTagFilters.appendChild(btn);
        });
    }
}

// ==========================================
// UTILS
// ==========================================
function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

function timeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return Math.floor(interval) + " years ago";
    interval = seconds / 2592000;
    if (interval > 1) return Math.floor(interval) + " months ago";
    interval = seconds / 86400;
    if (interval > 1) return Math.floor(interval) + " days ago";
    interval = seconds / 3600;
    if (interval > 1) return Math.floor(interval) + " hours ago";
    interval = seconds / 60;
    if (interval > 1) return Math.floor(interval) + " minutes ago";
    return Math.floor(seconds) < 30 ? "just now" : Math.floor(seconds) + " seconds ago";
}

function formatDate(dateStr) {
    const d = new Date(dateStr);
    // adjust for timezone issues visually if needed, but simple string is fine
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.innerText = str;
    return div.innerHTML;
}

function handleKeyboardShortcuts(e) {
    // Don't trigger if user is typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') {
        if (e.key === 'Escape') {
            e.target.blur();
        }
        return;
    }
    
    switch (e.key) {
        case 'n':
        case 'N':
            e.preventDefault();
            DOM.taskInput.focus();
            break;
        case '/':
            e.preventDefault();
            DOM.searchInput.focus();
            break;
        case '?':
            e.preventDefault();
            DOM.shortcutsModal.showModal();
            break;
        case 'Escape':
            DOM.shortcutsModal.close();
            break;
    }
}

// ==========================================
// BOOTSTRAP
// ==========================================
document.addEventListener('DOMContentLoaded', init);
