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

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB Connected");
  })
  .catch((err) => {
    console.error("Connection Error:", err);
  });


// SIGNUP ENDPOINT
app.post("/signup", async (req, res) => {
  try {
    const { signupName, signupEmail, signupPassword } = req.body;

    if (!signupName || !signupEmail || !signupPassword) {
      return res.status(401).json({ message: "Please fill in all the input fields" });
    }

    const collection = mongoose.connection.collection("users");
    const userEmail = await collection.findOne({ email: signupEmail })
    if (userEmail) {
      return res.status(409).json({ message: "Email is already in use", info: userEmail })
    }

    else {

      const newSignupName = signupName.replaceAll(" ", "").toLowerCase();
      const result = await collection.insertOne({
        email: signupEmail,
        role: "customer",
        password: signupPassword,
        userName: "@" + newSignupName,
        createrAt: new Date()
      })

      return res.status(200).json({ message: "User successfully signed up.", info: result })
    }

  }

  catch (error) {
    console.error("Error signing up: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
})


// LOGIN ENDPOINT
app.post("/login", async (req, res) => {
  try {
    const { loginEmail, loginPassword } = req.body;

    if (!loginEmail || !loginPassword) {
      return res.status(401).json({ messageType: "errorDisplay", message: "Please fill in all the form inputs to log in." });
    }

    const collection = mongoose.connection.collection("users");

    const userEmail = await collection.findOne({ userEmail: loginEmail });

    if (!userEmail) {
      return res.status(401).json({ messageType: "errorMessage", message: "Account not found; Signup?" })
    }

    if (userEmail.password !== password) {
      return res.status(401).json({ messageType: "errorMessage", message: "Password or email is incorrect." })
    }

    if (userEmail.password === password) {
      return res.status(200).json({ messageType: "loginOkay", message: "Welcome back to ...'Our website name', accessToken", accessToken: { role: userEmail.role, password: userEmail.password, email: userEmail.email } });
    }

  } catch (error) {
    console.error("Error logging in: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});



// Endpoint for resetting a password from the users profile
app.put("/resetPassword", async (req, res) => {
  try {

    const { userId, email, password, resetPassword, confirmPassword, userName } = req.body;

    const collection = mongoose.connection.collection("users");

    if (password === resetPassword) {

      return res.status(409).json({ message: "Cannot update the current password with the same password." })
    }

    if (password && resetPassword === confirmPassword) {
      const user = await collection.updateOne({ userId: userId }, { $set: { password: resetPassword } });
      return res.status(200).json({ message: "Password has been updated" })
    }


  } catch (error) {
    console.error("Error resetting the password: ", error);
    return res.status(500).json({ message: "Internal Server Error" })
  }
});



// Endpoint to get your user profile
app.get("/myProfile/:userId", async (req, res) => {
  try {

    const collection = await mongoose.connection.collection("users");
    const { userId } = req.params;

    const user = await collection.findOne({ userId })

    return res.status(200).json({ message: "Data successfully collected", userProfileInfo: user })

  } catch (error) {
    console.error("Unable to get user profile: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});



// Endpoint to get a record of all of the seats you have ever paid for ; we get it using ur unique user id
app.get("/seatPaymentsHistory/:userId", async (req, res) => {
  try {

    const collection = await mongoose.connection.collection("payments");
    const { userId } = req.params

    const user = await collection.findMany({ userId }).toArray();

    if (!user) {
      return res.status(404).json({ message: "No booking history available" })
    }
    return res.status(200).json({ message: "Seat history successfully found", seatHistory: user })

  } catch (error) {
    console.error("Error getting Payment History: ", error);
    return res.status(500).json({ message: "Internal server Error" });
  }
});



// End used by an admin to make a user a venue manager
app.post("/changeUserRoles", async (req, res) => {
  try {

    const { userName, role } = req.body;

    const collection = await mongoose.connection.collection("users");
  
     const user = await collection.findOne({ userName });
    if(!user){
      return res.status(409).json({message: "Unable to find user"});
    }

    if (role == "manager") {
      const user = await collection.updateOne({ userName }, { $set: { role } });
      const change = await collection.findOne({ userName })
      return res.status(200).json({
        message: "User role has been successfully changed to manager", changedRole: change
      })
    }
    else if (role == "customer") {
      const user = await collection.updateOne({ userName }, { $set: { role } });
      const change = await collection.findOne({ userName })
      return res.status(200).json({
        message: "User role has been successfully changed to customer", changedRole: change
      })
    }

  } catch (error) {
    console.error("During changing the users role: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});

// Endpoint used to get the user whose role we want to change 
app.get("/getUserByUserName/:userName", async (req, res) => {
  try{
    
    const collection = mongoose.connection.collection("users");

    const { userName } = req.params; 

    const user = await collection.findOne({ userName });

    if(!user){
      return res.status(404).json({message: "User not found."});
    }

    else{
      return res.status(200).json({message:"User found.", userName: user.userName, userRole: user.role })
    }
  }
  catch (error){
   console.error("Error finding user: ",error);
   return res.status(500).json({message:"Internal Server Error"});
  }
})


// End used by a user to book a seat at the cinema
app.post("/bookingSeat", async (req, res) => {
  try {

    const collection = await mongoose.connection.collection("payments");

const { userId, bookingPrice, eventDate, bookedBy, numberOfSeats, venueName, address } = req.body;
// Do not need to have the userid validted but need the booking id counter to create the booking id for the event

if( !bookingPrice || !eventDate || !bookedBy || !venueName || !address ){
  return res.status(409).json({ message:"Please fill in all the required fields before booking the venue." });
}

else {

  const user = await collection.insertOne({
    ...req.body, createdAt: new Date()
  });

  res.status(200).json({message:"User created successfully"})
}
  } catch (error){
    console.error("booking a seat endpoint: ", error);
    return res.status(500).json({ message:"Internal Server Error" });

  }
});



// End used by a manager to create a new venue that they own
app.post("/newVenue", async (req, res) => {
  try {

  } catch {

  }
});



// Endpoint used to delete a venue that will no longer be shown on the app
app.delete("/removeMyVenue/venueName", async (req, res) => {
  try {
    const { venueName } = req.params
  const collection = mongoose.connection.collection("venues");
  const venue = await collection.findOne({ venueName })

  if( !venue ){
    return res.status(404).json({ message: "Venue does not exist." });
  } else{
    await collection.deleteOne({ venueName })
  }
  } catch (error) {
console.error("Error deleting a venue: ",error);
return res.status(500).json({message: "Internal Server Error"});
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
app.post("/postForms", async (req, res) => {

  try {
    const { email, subject } = req.body;
    const collection = mongoose.connection.collection("Contact");

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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});



