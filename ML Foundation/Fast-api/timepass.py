from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class UserData(BaseModel):
    age: int
    salary: float
    experience: int

class Student(BaseModel):
    hours_studied: float
    attendance: float
    previous_score: float

@app.get("/")
def home():
    return {"message": "Hello, FastAPI!"}

@app.get("/about")
def about():
    return {
        "name": "Rohit",
        "field": "Machine Learning"
    }

@app.get("/users/{user_id}")
def get_user(user_id: int):
    return {
        "user_id": user_id
    }

@app.get("/products")
def get_products(limit: int = 10):
    return {
        "limit": limit
    }

@app.post("/predict")
def predict(data: Student):

    features = [[
        data.hours_studied,
        data.attendance,
        data.previous_score
    ]]

    prediction = model.predict(features)

    return {
        "prediction": float(prediction[0])
    }

@app.post("/users")
def create_user(data: dict):
    return data