// 1. 引入模块
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose"); // <<<< 新增：引入 mongoose
require("dotenv").config(); // <<<< 新增：加载 .env 文件中的环境变量

// 【移除】不再需要 fs 和 path 模块来读写文件
// const fs = require('fs');
// const path = require('path');

// 2. 创建一个 express 应用实例
const app = express();

// CORS 和 express.json 中间件保持不变
app.use(
  cors({
    origin: "https://my-todo-list-frontend-newbie-auntie-codes.onrender.com", // 根据您的前端地址调整
  })
);
app.use(express.json());

// 【移除】数据文件路径和内存中的 todos 数组，以及 loadTodos/saveTodos 函数
// const DATA_FILE = path.join(__dirname, 'todos.json');
// let todos = [];
// function loadTodos() { /* ... */ }
// function saveTodos() { /* ... */ }
// loadTodos(); // 移除调用

// 3. 定义服务器监听的端口号 (保持不变)
const port = process.env.PORT || 3000; // 可以使用环境变量配置端口，或者默认3000

// 【新增】连接到 MongoDB Atlas
const mongoURI = process.env.MONGODB_URI;

mongoose
  .connect(mongoURI)
  .then(() => console.log("成功连接到 MongoDB Atlas!"))
  .catch((err) => console.error("连接 MongoDB 失败:", err));

// ... (mongoose.connect 代码) ...

// 【新增】定义 Todo 的 Schema (数据结构)
const todoSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true, // 文本内容是必需的
      trim: true, // 自动去除前后空格
    },
    completed: {
      type: Boolean,
      default: false, // 默认是未完成状态
    },
    // Mongoose 会自动为每个文档添加一个 createdAt 和 updatedAt 时间戳字段
    // 如果你想显式控制，可以这样写：
    // createdAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
); // timestamps: true 会自动添加 createdAt 和 updatedAt

// 【新增】将 _id 转换为 id，并移除 __v (版本键) 在转换为 JSON 时
todoSchema.set("toJSON", {
  transform: (document, returnedObject) => {
    returnedObject.id = returnedObject._id.toString(); // 将 _id 转换为字符串 id
    delete returnedObject._id; // 删除原始的 _id
    delete returnedObject.__v; // 删除版本键 __v
  },
});

// 【新增】基于 Schema 创建 Todo Model
// Mongoose 会自动将模型名 'Todo' 转换为小写并复数化作为数据库中的集合名，即 'todos'
const Todo = mongoose.model("Todo", todoSchema);

// ... (Todo Model 定义之后) ...

// 【修改】获取所有 Todo 事项的 API 接口 (GET)
app.get("/api/todos", async (req, res) => {
  // <<<< 1. 变成异步函数 async
  try {
    const todosFromDB = await Todo.find({}); // <<<< 2. 从数据库查询所有 todos
    res.json(todosFromDB); // <<<< 3. 返回查询结果
  } catch (error) {
    console.error("获取待办事项失败:", error);
    res.status(500).json({ message: "服务器错误，获取待办事项失败" }); // <<<< 4. 错误处理
  }
});

// 【修改】创建添加新 Todo 事项的 API 接口 (POST)
app.post("/api/todos", async (req, res) => {
  // <<<< 1. 变成异步函数 async
  try {
    const newTodoText = req.body.text;

    if (!newTodoText || newTodoText.trim() === "") {
      return res.status(400).json({ message: "待办事项的文本内容不能为空" });
    }

    // 2. 创建一个新的 Todo 文档实例
    const todo = new Todo({
      text: newTodoText.trim(),
      // 'completed' 字段会使用 Schema 中定义的默认值 false
    });

    // 3. 将新文档保存到数据库
    const savedTodo = await todo.save();

    res.status(201).json(savedTodo); // <<<< 4. 返回保存后的文档（包含数据库生成的 id）
  } catch (error) {
    console.error("添加待办事项失败:", error);
    // Mongoose 校验错误通常会是 error.name === 'ValidationError'
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "输入数据无效", errors: error.errors });
    }
    res.status(500).json({ message: "服务器错误，添加待办事项失败" }); // <<<< 5. 错误处理
  }
});

// 【修改】更新指定 ID 的 Todo 事项 (例如标记完成)
app.put("/api/todos/:id", async (req, res) => {
  // <<<< 1. 变成异步函数 async
  try {
    const todoId = req.params.id;
    const { completed, text } = req.body; // <<<< 2. 同时允许更新 completed 和 text

    // 构建要更新的字段对象
    const updateFields = {};
    if (typeof completed === "boolean") {
      updateFields.completed = completed;
    }
    // 如果也允许更新文本，可以这样添加：
    if (text !== undefined && typeof text === "string") {
      // 可以添加校验，比如 text.trim() !== ''
      if (text.trim() === "") {
        return res
          .status(400)
          .json({ message: "待办事项的文本内容不能为空 (如果尝试更新的话)" });
      }
      updateFields.text = text.trim();
    }

    if (Object.keys(updateFields).length === 0) {
      return res.status(400).json({
        message: '请求体中必须包含要更新的 "completed" 或 "text" 字段',
      });
    }

    // 3. 查找并更新数据库中的文档
    const updatedTodo = await Todo.findByIdAndUpdate(
      todoId, // 要更新的文档的 ID
      updateFields, // 要更新的字段和它们的新值
      { new: true, runValidators: true } // 选项：new:true 返回更新后的文档, runValidators:true 确保更新时也执行Schema校验
    );

    if (!updatedTodo) {
      // <<<< 4. 如果没有找到文档
      return res.status(404).json({ message: "未找到要更新的待办事项" });
    }

    res.json(updatedTodo); // <<<< 5. 返回更新后的文档
  } catch (error) {
    console.error("更新待办事项失败:", error);
    if (error.name === "CastError" && error.kind === "ObjectId") {
      // <<<< 6. 处理无效的ID格式
      return res.status(400).json({ message: "无效的待办事项 ID 格式" });
    }
    if (error.name === "ValidationError") {
      return res
        .status(400)
        .json({ message: "输入数据无效", errors: error.errors });
    }
    res.status(500).json({ message: "服务器错误，更新待办事项失败" });
  }
});

// 【修改】删除指定 ID 的 Todo 事项
app.delete("/api/todos/:id", async (req, res) => {
  // <<<< 1. 变成异步函数 async
  try {
    const todoId = req.params.id;

    // 2. 从数据库中查找并删除文档
    const deletedTodo = await Todo.findByIdAndDelete(todoId);

    if (!deletedTodo) {
      // <<<< 3. 如果没有找到要删除的文档
      return res.status(404).json({ message: "未找到要删除的待办事项" });
    }

    // 4. 成功删除，返回 204 No Content
    // 或者也可以返回被删除的对象: res.json({ message: '删除成功', deletedTodo });
    res.status(204).send();
  } catch (error) {
    console.error("删除待办事项失败:", error);
    if (error.name === "CastError" && error.kind === "ObjectId") {
      return res.status(400).json({ message: "无效的待办事项 ID 格式" });
    }
    res.status(500).json({ message: "服务器错误，删除待办事项失败" });
  }
});

app.listen(port, () => {
  console.log(`服务器正在 http://localhost:${port} 上运行`);
  // Mongoose 连接成功/失败的日志会在 mongoose.connect 的 .then/.catch 中打印
  console.log("---可用的API端点 (现在使用 MongoDB)---");
  console.log("GET    /api/todos        -> 获取所有待办事项");
  console.log("POST   /api/todos        -> 添加新的待办事项");
  console.log("PUT    /api/todos/:id    -> 更新指定待办事项");
  console.log("DELETE /api/todos/:id    -> 删除指定待办事项");
});
