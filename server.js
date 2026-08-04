import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

import cors from 'cors';
// Allow requests specifically from your frontend port
app.use(cors({ origin: 'http://localhost:5173' }));

async function basicAuth(req, res, next) {
  const authHeader = req.headers.authorization;

  // Get the user/password from http headers
  if (!authHeader || !authHeader.startsWith("Basic ")) {
    return res.status(401).json({ message: "Authorization header missing or invalid" });
  }

  // Split the credentials into a user/password
  const base64Credentials = authHeader.split(" ")[1];
  const credentials = base64.decode(base64Credentials).split(":");
  const email = credentials[0];
  const password = credentials[1];

  // Read MongoDB 
  const collection = db.collection("Users");
  const user = await collection.findOne({ email });

  // If user is not found
  if (!user) {
    return res.status(401).json({ message: "User not found" });
  }

  // Decode and check the password
  const decodedStoredPassword = base64.decode(user.password);
  if (decodedStoredPassword !== password) {
    return res.status(401).json({ message: "Invalid password" });
  }
  req.user = user;
  next();
}



// End point to handle signup
app.post("/signup", async (req, res) => {

});



// Endpoint to login 
app.post("/login", async (req, res) => {
 
})



// Apply the basicAuth to all the endpoints that require authentication besides the sign up
app.use(basicAuth);



// Endpoint for displaying all the products that we have
app.get("/products", async (req, res) => {
  try {
    const collection = db.collection("Products");

    const allProducts = await collection.find({}).toArray();

    if (!allProducts || allProducts.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    res.status(200).json(allProducts);
  } catch (error) {
    console.error("Error fetching all products", error);
    res.status(500).json({ message: "Internal server Error" });
  }
});



// Endpoint for viewing extra information about the product details
app.get("/productdetail/:productId", async (req, res) => {
  try {
    const collection = db.collection("Products");

    const productDetail = await collection.findOne({ productId: req.params.productId });
    if (!productDetail) {
      return res.status(404).json({ message: 'Product not found' });
    }
    res.status(200).json(productDetail);
  } catch (error) {
    console.error("Error fetching product's details", error);
    res.status(500).json({ message: "Internal server Error" });
  }

});



// Endpoint for resetting a password from the users profile
app.put("/passwordReset", async (req, res) => {
  try {
   
    
  } catch (error) {
 
  }
});


// Endpoint to get your user profile
app.get("/myProfile", async (req, res) => {
  try {
  
  } catch (error) {

  }
});

// Endpoint to get a record of all of the seats you have ever paid for ; we get it using ur unique user id
app.get("/seatPaymentsHistory", async (req, res) => {
  try {
  
  } catch (error) {

  }
});

// End used by an admin to make a user a venue manager
app.post("/changeUserRoles", async (req, res) => {
  try {
    
  } catch {
  
}
});

// End used by a user to book a seat at the cinema
app.post("/bookingSeat", async (req, res) => {
  try {
    
  } catch {
  
}
});

// End used by a manager to create a new venue that they own
app.post("/newVenue", async (req, res) => {
  try {
    
  } catch {
  
}
});

// Endpoint used to delete a venue that will no longer be shown on the app
app.delete("/removeMyVenue", async (req, res) => {
  try {
h
  } catch (error) {

  }
});

// Endpoint used to update the information of an existing venue
app.put("/venueUpdate", async (req, res) => {
  try {


  } catch (error) {
  }
});



// Endpoint used to get all the times a venue was booked based on the venue id
app.get("/venueBookingHistory", async (req, res) => {
  try {

  
  } catch (error) {

  }
});



// Endpoint used to book a venue
app.post("/bookingVenue", async (req, res) => {
  try {
5
  } catch (error) {
 
  }
});

// Edit an event that is already public
app.put("/editUpcomingEvent", async (req, res) => {
  try {
h
  } catch (error) {

  }
});

// Endpoint used to get all the events that are coming to display it
app.get("/upcomingEvent", async (req, res) => {
  try {
f
  } catch (error) {

  }
});


// Endpoint used to post review forms
app.post("/postforms", async (req, res) => {

  try {
    const { email, subject } = req.body;
    const collection = db.collection("Contact");

    if (!email || !subject) {
      return res.status(404).json({ message: "Email and subject are required" });
    }

    const result = await collection.insertOne({ ...req.body, createdAt: new Date() });

    res.status(201).json({ message: "Your form has been sent and recieved by admin", formId: result.insertedId });
  } catch (error) {
    console.error("Unable to send and store the request", error);
    res.status(500).json({ message: "Intenral server error" });
  }
});

mongoose.connect(process.env.MONGO_URI)
.then(() => {
    console.log("MongoDB Connected");
})
.catch((err) => {
    console.error("Connection Error:", err);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
