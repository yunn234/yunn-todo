// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import { getDatabase, ref, push, set, update, remove, onValue, orderByChild, query as dbQuery } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-database.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyD7v_aWkUcXDN0L2e9YorCoSNn_LNU5uH8",
    authDomain: "yunn-todo-backend.firebaseapp.com",
    projectId: "yunn-todo-backend",
    storageBucket: "yunn-todo-backend.firebasestorage.app",
    messagingSenderId: "736294176955",
    appId: "1:736294176955:web:b674406b9db4f9f476c19e",
    databaseURL: "https://yunn-todo-backend-default-rtdb.firebaseio.com/"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// 할일 데이터 저장소
let todos = [];
let currentFilter = 'all';
let editingId = null;

// DOM 요소
const todoInput = document.getElementById('todoInput');
const addBtn = document.getElementById('addBtn');
const todoList = document.getElementById('todoList');
const todoCount = document.getElementById('todoCount');
const clearCompleted = document.getElementById('clearCompleted');
const filterBtns = document.querySelectorAll('.filter-btn');

// Firebase Realtime Database에서 할일 목록 가져오기
function loadTodos() {
    try {
        // Firebase Realtime Database의 'todos' 경로 참조 생성
        const todosRef = ref(db, 'todos');
        
        // createdAt 필드를 기준으로 정렬하는 쿼리 생성
        const q = dbQuery(todosRef, orderByChild('createdAt'));
        
        // 실시간 업데이트를 위한 리스너 설정
        // 데이터가 변경될 때마다 자동으로 호출됩니다
        onValue(q, (snapshot) => {
            // 기존 할일 배열 초기화
            todos = [];
            
            // 데이터가 존재하는지 확인
            if (snapshot.exists()) {
                // Firebase에서 가져온 데이터 (객체 형태)
                const data = snapshot.val();
                
                // Firebase Realtime Database는 객체 형태로 데이터를 저장하므로
                // 각 키(고유 ID)를 사용하여 배열로 변환
                Object.keys(data).forEach(key => {
                    todos.push({
                        id: key,  // Firebase에서 생성된 고유 ID
                        text: data[key].text,
                        completed: data[key].completed || false,
                        createdAt: data[key].createdAt
                    });
                });
                
                // createdAt 기준 내림차순 정렬 (최신 항목이 위에 오도록)
                todos.sort((a, b) => {
                    if (b.createdAt < a.createdAt) return -1;
                    if (b.createdAt > a.createdAt) return 1;
                    return 0;
                });
                
                console.log(`Firebase에서 ${todos.length}개의 할일을 불러왔습니다.`);
            } else {
                console.log('Firebase에 저장된 할일이 없습니다.');
            }
            
            // 화면에 할일 목록 렌더링
            renderTodos();
        }, (error) => {
            // 에러 발생 시 처리
            console.error('Firebase에서 할일을 불러오는 중 오류 발생:', error);
            alert('할일을 불러오는 중 오류가 발생했습니다: ' + error.message);
            
            // 에러 발생 시에도 빈 목록으로 렌더링
            todos = [];
            renderTodos();
        });
    } catch (error) {
        console.error('할일 목록 로드 함수 실행 중 오류:', error);
        alert('할일 목록을 불러오는 중 오류가 발생했습니다: ' + error.message);
        todos = [];
        renderTodos();
    }
}

// 렌더링만 수행 (데이터는 Firebase에서 실시간으로 동기화됨)
function saveTodos() {
    renderTodos();
}

// Firebase Realtime Database를 통한 할일 추가
async function addTodo() {
    const text = todoInput.value.trim();
    
    if (text === '') {
        alert('할일을 입력해주세요!');
        return;
    }

    try {
        // Firebase Realtime Database에 저장할 할일 데이터
        const newTodo = {
            text: text,
            completed: false,
            createdAt: new Date().toISOString()
        };

        // Realtime Database의 'todos' 경로에 새 항목 추가
        // push() 함수가 자동으로 고유 ID를 생성합니다
        const todosRef = ref(db, 'todos');
        await push(todosRef, newTodo);
        
        // 입력 필드 초기화 및 포커스
        todoInput.value = '';
        todoInput.focus();
        
        console.log('할일이 Firebase에 성공적으로 추가되었습니다.');
    } catch (error) {
        console.error('할일 추가 중 오류 발생:', error);
        alert('할일을 추가하는 중 오류가 발생했습니다: ' + error.message);
    }
}

// 할일 삭제
async function deleteTodo(id) {
    if (confirm('정말 삭제하시겠습니까?')) {
        try {
            const todoRef = ref(db, `todos/${id}`);
            await remove(todoRef);
        } catch (error) {
            console.error('할일 삭제 중 오류 발생:', error);
            alert('할일을 삭제하는 중 오류가 발생했습니다.');
        }
    }
}

// 할일 완료 상태 토글
async function toggleTodo(id) {
    const todo = todos.find(t => t.id === id);
    if (!todo) return;

    try {
        const todoRef = ref(db, `todos/${id}`);
        await update(todoRef, {
            completed: !todo.completed
        });
    } catch (error) {
        console.error('할일 상태 변경 중 오류 발생:', error);
        alert('할일 상태를 변경하는 중 오류가 발생했습니다.');
    }
}

// 할일 수정 시작
function startEdit(id) {
    editingId = id;
    renderTodos();
}

// 할일 수정 저장
async function saveEdit(id, newText) {
    if (newText.trim() === '') {
        alert('할일 내용을 입력해주세요!');
        return;
    }

    try {
        const todoRef = ref(db, `todos/${id}`);
        await update(todoRef, {
            text: newText.trim()
        });
        editingId = null;
    } catch (error) {
        console.error('할일 수정 중 오류 발생:', error);
        alert('할일을 수정하는 중 오류가 발생했습니다.');
    }
}

// 할일 수정 취소
function cancelEdit() {
    editingId = null;
    renderTodos();
}

// 필터 변경
function setFilter(filter) {
    currentFilter = filter;
    filterBtns.forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.filter === filter) {
            btn.classList.add('active');
        }
    });
    renderTodos();
}

// 필터링된 할일 목록 가져오기
function getFilteredTodos() {
    switch (currentFilter) {
        case 'active':
            return todos.filter(todo => !todo.completed);
        case 'completed':
            return todos.filter(todo => todo.completed);
        default:
            return todos;
    }
}

// 할일 목록 렌더링
function renderTodos() {
    const filteredTodos = getFilteredTodos();
    
    if (filteredTodos.length === 0) {
        todoList.innerHTML = '<div class="empty-state">할일이 없습니다</div>';
    } else {
        todoList.innerHTML = filteredTodos.map(todo => {
            const isEditing = editingId === todo.id;
            
            if (isEditing) {
                return `
                    <div class="todo-item">
                        <input 
                            type="text" 
                            class="todo-text editing" 
                            value="${escapeHtml(todo.text)}"
                            id="edit-input-${todo.id}"
                            autocomplete="off"
                        >
                        <div class="todo-actions">
                            <button class="btn-save" onclick="saveEdit('${todo.id}', document.getElementById('edit-input-${todo.id}').value)">
                                저장
                            </button>
                            <button class="btn-cancel" onclick="cancelEdit()">
                                취소
                            </button>
                        </div>
                    </div>
                `;
            }
            
            return `
                <div class="todo-item ${todo.completed ? 'completed' : ''}">
                    <input 
                        type="checkbox" 
                        class="todo-checkbox" 
                        ${todo.completed ? 'checked' : ''}
                        onchange="toggleTodo('${todo.id}')"
                    >
                    <span class="todo-text">${escapeHtml(todo.text)}</span>
                    <div class="todo-actions">
                        <button class="btn-edit" onclick="startEdit('${todo.id}')">
                            수정
                        </button>
                        <button class="btn-delete" onclick="deleteTodo('${todo.id}')">
                            삭제
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    // 수정 모드일 때 입력 필드에 포커스
    if (editingId) {
        const editInput = document.getElementById(`edit-input-${editingId}`);
        if (editInput) {
            editInput.focus();
            editInput.select();
            
            // Enter 키로 저장, Escape 키로 취소
            editInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    saveEdit(editingId, editInput.value);
                } else if (e.key === 'Escape') {
                    cancelEdit();
                }
            });
        }
    }

    // 통계 업데이트
    const activeCount = todos.filter(todo => !todo.completed).length;
    const completedCount = todos.filter(todo => todo.completed).length;
    todoCount.textContent = `진행중: ${activeCount}개, 완료: ${completedCount}개`;
}

// XSS 방지를 위한 HTML 이스케이프
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 완료된 항목 모두 삭제
async function clearCompletedTodos() {
    const completedTodos = todos.filter(todo => todo.completed);
    const completedCount = completedTodos.length;
    
    if (completedCount === 0) {
        alert('완료된 항목이 없습니다.');
        return;
    }

    if (confirm(`완료된 ${completedCount}개의 항목을 모두 삭제하시겠습니까?`)) {
        try {
            const deletePromises = completedTodos.map(todo => {
                const todoRef = ref(db, `todos/${todo.id}`);
                return remove(todoRef);
            });
            await Promise.all(deletePromises);
        } catch (error) {
            console.error('완료된 항목 삭제 중 오류 발생:', error);
            alert('완료된 항목을 삭제하는 중 오류가 발생했습니다.');
        }
    }
}

// 이벤트 리스너
addBtn.addEventListener('click', addTodo);

todoInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        addTodo();
    }
});

clearCompleted.addEventListener('click', clearCompletedTodos);

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        setFilter(btn.dataset.filter);
    });
});

// HTML onclick에서 사용할 수 있도록 전역 함수 노출
window.startEdit = startEdit;
window.saveEdit = saveEdit;
window.deleteTodo = deleteTodo;
window.toggleTodo = toggleTodo;
window.cancelEdit = cancelEdit;

// 앱 초기화
loadTodos();
