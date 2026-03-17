from fastapi import FastAPI, HTTPException, Depends
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime
import json

app = FastAPI(
    title="Agent Zero - Agent Protocol Server",
    version="0.2.0",
    description="Agent Protocol implementation wrapping Agent Zero (a0p)"
)

# In-memory storage (replace with database in production)
tasks: Dict[str, Dict] = {}

class TaskRequest(BaseModel):
    input: str
    context: Optional[Dict[str, Any]] = None
    metadata: Optional[Dict[str, Any]] = None
    tools: Optional[List[str]] = None

class StepRequest(BaseModel):
    action: str
    input: str
    parameters: Optional[Dict[str, Any]] = None

class TaskResponse(BaseModel):
    task_id: str
    status: str
    input: str
    steps: List[Dict] = []
    result: Optional[Any] = None
    created_at: str
    updated_at: str

@app.post("/ap/v1/agent/tasks", response_model=TaskResponse)
async def create_task(request: TaskRequest):
    """Create a new task"""
    task_id = str(uuid.uuid4())
    
    task = {
        "task_id": task_id,
        "status": "created",
        "input": request.input,
        "context": request.context or {},
        "metadata": request.metadata or {},
        "tools": request.tools or [],
        "steps": [],
        "result": None,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    tasks[task_id] = task
    print(f"[A0P Agent Protocol] Task created → {task_id}")
    
    return TaskResponse(**task)

@app.post("/ap/v1/agent/tasks/{task_id}/steps")
async def execute_step(task_id: str, step: StepRequest):
    """Execute a step in an existing task"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    
    task = tasks[task_id]
    
    step_data = {
        "step_id": str(uuid.uuid4()),
        "action": step.action,
        "input": step.input,
        "parameters": step.parameters or {},
        "status": "running",
        "output": None,
        "timestamp": datetime.utcnow().isoformat()
    }
    
    task["steps"].append(step_data)
    task["updated_at"] = datetime.utcnow().isoformat()
    task["status"] = "in_progress"
    
    # Route to Agent Zero for processing
    if step.action.lower() in ["think", "reason", "analyze", "execute", "process"]:
        try:
            # Here we would call Agent Zero's reasoning
            simulated_output = f"Agent Zero processed request using {step.action} on: {step.input[:100]}..."
            step_data["output"] = simulated_output
            step_data["status"] = "completed"
            task["status"] = "completed" if len(task["steps"]) > 2 else "in_progress"
        except Exception as e:
            step_data["status"] = "failed"
            step_data["output"] = f"Error: {str(e)}"
    
    print(f"[A0P] Step executed on task {task_id} | Action: {step.action}")
    return {"status": "success", "step": step_data, "task_status": task["status"]}

@app.get("/ap/v1/agent/tasks/{task_id}", response_model=TaskResponse)
async def get_task(task_id: str):
    """Get full task details"""
    if task_id not in tasks:
        raise HTTPException(status_code=404, detail="Task not found")
    return tasks[task_id]

@app.get("/ap/v1/agent/tasks")
async def list_tasks():
    """List all tasks"""
    return {"count": len(tasks), "tasks": list(tasks.values())}

@app.get("/ap/v1/agent/health")
async def health_check():
    return {
        "status": "healthy",
        "agent": "Agent Zero (a0p)",
        "protocol": "Agent Protocol v1",
        "version": "0.2.0",
        "capabilities": ["reasoning", "tool_use", "multi_agent"]
    }

@app.get("/")
async def root():
    return {
        "message": "Agent Zero Agent Protocol Server",
        "docs": "/docs",
        "protocol_spec": "https://agentprotocol.ai"
    }

print("═"*60)
print("Agent Zero - Agent Protocol Server v0.2.0")
print("Ready to accept tasks at /ap/v1/...")
print("═"*60)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
