from fastapi import FastAPI
from pydantic import BaseModel
import joblib
import pandas as pd

app = FastAPI()


# Load trained ML objects
model = joblib.load("../House_prediction/house_price_model.joblib")
poly = joblib.load("../House_prediction/polynomial_features.joblib")


class HouseData(BaseModel):
    area: float
    bedrooms: int
    bathrooms: int
    stories: int

    mainroad: int
    guestroom: int
    basement: int
    hotwaterheating: int
    airconditioning: int

    parking: int
    prefarea: int

    semi_furnished: int
    unfurnished: int


@app.get("/")
def home():
    return {
        "message": "House Price Prediction API"
    }


@app.post("/predict")
def predict(data: HouseData):

    input_data = pd.DataFrame([[
        data.area,
        data.bedrooms,
        data.bathrooms,
        data.stories,
        data.mainroad,
        data.guestroom,
        data.basement,
        data.hotwaterheating,
        data.airconditioning,
        data.parking,
        data.prefarea,
        data.semi_furnished,
        data.unfurnished
    ]], columns=[
        "area",
        "bedrooms",
        "bathrooms",
        "stories",
        "mainroad",
        "guestroom",
        "basement",
        "hotwaterheating",
        "airconditioning",
        "parking",
        "prefarea",
        "furnishingstatus_semi-furnished",
        "furnishingstatus_unfurnished"
    ])

    # Polynomial transformation
    input_poly = poly.transform(input_data)

    # Prediction
    prediction = model.predict(input_poly)

    return {
        "predicted_price": float(prediction[0])
    }