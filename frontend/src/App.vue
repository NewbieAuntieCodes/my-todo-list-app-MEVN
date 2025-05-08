<script setup>
import { ref, onMounted } from 'vue'

const todos = ref([])
const newTodoText = ref('')
const isLoading = ref(false)
const error = ref(null)

const API_URL = 'https://my-todo-list-app-mevn.onrender.com/api/todos'

async function fetchTodos() {
  // ... (fetchTodos 方法保持不变)
  isLoading.value = true
  error.value = null
  try {
    const response = await fetch(API_URL)
    if (!response.ok) {
      throw new Error(`获取数据失败: ${response.status} ${response.statusText}`)
    }
    const data = await response.json()
    todos.value = data
  } catch (e) {
    console.error('获取待办事项失败:', e)
    error.value = e.message
  } finally {
    isLoading.value = false
  }
}

async function addTodo() {
  // ... (addTodo 方法保持不变)
  if (newTodoText.value.trim() === '') return
  isLoading.value = true
  error.value = null
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: newTodoText.value.trim() }),
    })
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `添加失败: ${response.status} ${response.statusText}` }))
      throw new Error(errorData.message || `添加失败: ${response.status} ${response.statusText}`)
    }
    const newTodoFromServer = await response.json()
    todos.value.unshift(newTodoFromServer)
    newTodoText.value = ''
  } catch (e) {
    console.error('添加待办事项失败:', e)
    error.value = e.message
  } finally {
    isLoading.value = false
  }
}

async function toggleTodoCompletion(todoToUpdate) {
  // ... (toggleTodoCompletion 方法保持不变)
  isLoading.value = true
  error.value = null
  const newCompletedState = !todoToUpdate.completed
  try {
    const response = await fetch(`${API_URL}/${todoToUpdate.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: newCompletedState }),
    })
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: `更新失败: ${response.status} ${response.statusText}` }))
      throw new Error(errorData.message || `更新失败: ${response.status} ${response.statusText}`)
    }
    const updatedTodoFromServer = await response.json()
    const index = todos.value.findIndex((todo) => todo.id === updatedTodoFromServer.id)
    if (index !== -1) {
      todos.value[index] = updatedTodoFromServer
    }
  } catch (e) {
    console.error('更新待办事项失败:', e)
    error.value = e.message
  } finally {
    isLoading.value = false
  }
}

// 5. 【新增】removeTodo 方法
async function removeTodo(todoIdToDelete) {
  // 可以添加一个确认对话框，防止用户误删
  if (!confirm('确定要删除这个待办事项吗？')) {
    return // 如果用户取消，则不执行任何操作
  }

  isLoading.value = true
  error.value = null

  try {
    const response = await fetch(`${API_URL}/${todoIdToDelete}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      // DELETE 请求如果失败，可能不会返回 JSON body，所以错误处理可能稍有不同
      // 但我们的后端在找不到时会返回 JSON，可以尝试解析
      const errorData = await response
        .json()
        .catch(() => ({ message: `删除失败: ${response.status} ${response.statusText}` }))
      throw new Error(errorData.message || `删除失败: ${response.status} ${response.statusText}`)
    }

    // 如果后端返回 204 No Content，response.ok 会是 true，但 response.json() 会报错
    // 所以我们直接在前端过滤掉被删除的项
    todos.value = todos.value.filter((todo) => todo.id !== todoIdToDelete)
  } catch (e) {
    console.error('删除待办事项失败:', e)
    error.value = e.message
  } finally {
    isLoading.value = false
  }
}

onMounted(() => {
  fetchTodos()
})
</script>

<template>
  <div id="app-container">
    <h1>我的待办事项列表</h1>

    <form @submit.prevent="addTodo" class="add-todo-form">
      <input type="text" v-model="newTodoText" placeholder="例如：学习如何发送 POST 请求" />
      <button type="submit">添加</button>
    </form>

    <p v-if="!todos.length && !isLoading && !error">列表为空，添加一些待办事项吧！</p>
    <p v-if="isLoading">正在加载/更新/删除待办事项...</p>
    <p v-if="error" class="error-message">{{ error }}</p>

    <ul v-if="todos.length">
      <li v-for="todoObj in todos" :key="todoObj.id" :class="{ completed: todoObj.completed }">
        <input
          type="checkbox"
          :checked="todoObj.completed"
          @change="toggleTodoCompletion(todoObj)"
        />
        <span @click="toggleTodoCompletion(todoObj)" class="todo-text">
          {{ todoObj.text }}
        </span>

        <button @click="removeTodo(todoObj.id)" class="delete-btn">删除</button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
/* 这里是 CSS 样式 */
/* "scoped" 属性意味着这里的样式只作用于当前组件 */
#app-container {
  max-width: 600px;
  margin: 50px auto; /* 上下 50px，左右自动居中 */
  padding: 20px;
  font-family: sans-serif;
  border: 1px solid #eee;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

h1 {
  text-align: center;
  color: #2c3e50;
}

ul {
  list-style-type: none; /* 去掉列表项前面的小圆点 */
  padding: 0;
}

li {
  /* ... (li 的样式，包括 display: flex, align-items: center 保持不变) ... */
  padding: 10px 0;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  align-items: center;
}

li:last-child {
  border-bottom: none;
}

/* 【新增】复选框样式 */
li input[type='checkbox'] {
  margin-right: 10px;
  cursor: pointer;
}

/* 【新增】待办事项文本样式 */
.todo-text {
  cursor: pointer; /* 提示文本也可点击 */
  flex-grow: 1; /* 让文本占据剩余空间 */
}

/* 【新增】删除按钮样式 */
.delete-btn {
  background-color: #d9534f; /* 红色背景 */
  color: white;
  border: none;
  padding: 5px 10px;
  border-radius: 4px;
  cursor: pointer;
  margin-left: auto; /* 【重要】让删除按钮靠右显示 */
}

.delete-btn:hover {
  background-color: #c9302c;
}

/* 【新增】已完成待办事项的样式 */
li.completed .todo-text {
  /* 只对 li.completed 下的 .todo-text 应用样式 */
  text-decoration: line-through; /* 删除线 */
  color: #aaa; /* 颜色变灰 */
}

.add-todo-form {
  display: flex; /* 让输入框和按钮在同一行 */
  margin-bottom: 20px;
}

.add-todo-form input[type='text'] {
  flex-grow: 1; /* 让输入框占据剩余空间 */
  padding: 10px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-right: 10px; /* 和按钮之间留点空隙 */
}

.add-todo-form button {
  padding: 10px 15px;
  background-color: #5cb85c; /* 绿色背景 */
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.add-todo-form button:hover {
  background-color: #4cae4c;
}

.error-message {
  color: red;
  margin-bottom: 15px;
}
</style>
