import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import cors from 'cors';
import { auth } from "./firebase.js";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";

dotenv.config();

// Multer set up
const storage = multer.memoryStorage();
const upload = multer({ storage });

// const auth = getAuth();
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
// Allow requests specifically from your frontend port
app.use(cors());

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

    // Collecting all of the information sent from the frontend
    const { email, password, userName } = req.body;
    const collection = mongoose.connection.collection("users");


    // Insuring that all of the input fields were filled in by the user
    if (!userName || !email || !password) {
      return res.status(401).json({ message: "Please fill in all of the input fields" });
    }

    // Checking to see if there is already someone using that email 
    const user = await collection.findOne({ email })
    console.log("Database user search: ", user)
    if (user) {
      return res.status(409).json({ message: "Email is already in use" })
    }

    // VERIFYING THE PASSWORD FORMAT
    if (password.length < 6) {

      console.log("Your password needs to be longer than 6 characters ")
      return res.status(400).json({ message: "Your password needs to be longer than 6 characters " });
    }

    // Creating the users account when all of the requirements are met.
    else {

      // Signing up a user to firebase first before savingtheir email in mongo DB
      // If theres ever an error while signing up in firebase ;
      //  firebase responds by sending the error to the actual error block
      //  so the error handling for firebase occursin the error block;

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const accessToken = userCredential.user;
      console.log(accessToken);

      // Formatting provided for the username so that the users username will look like an instagram handle
      const newUserName = userName.replaceAll(" ", "").toLowerCase();


      // Changing all of the email characters to lowercase
      // because firebase always returns an email in lowercase when a user signs in.
      const lowerCase = email.toLowerCase();
      
      // Saving a user in mongoDB once they have been successfully signed up with fire base
      const result = await collection.insertOne({
        email: email,
        lowerCase: lowerCase,
        role: "customer", //EVERY NEW USER MUST BE GIVEN THE DEFAULT ROLE OF CUSTOMER ON THEIR INITIAL SIGNUP
        userName: "@" + newUserName,
        createdAt: new Date()
      })

      return res.status(200).json({ message: "Successfully signed in.", accessToken: accessToken })
    }
  }

  catch (error) {

    if (error.code.includes("auth/email-already-in-use")) {
      console.log("The error message is meant for the frontend and is coming from firebase around line 59");
      return res.status(400).json({ message: "Email is already being used" });
    }

    if (error.code.includes("invalid-email")) {
      console.log("The error message is meant for the frontend and is coming from firebase around line 59");
      return res.status(400).json({ message: "Invalid email format is being used" });
    }

    console.error("Error signing up: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
})



// ENDPOINT USED TO MAKE A USER LOG INTO THE WEBSITE USING FIREBASE
app.post("/login", async (req, res) => {

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Please fill in all of the required fields" });
    }

    const collection = mongoose.connection.collection("users");
    const user = await collection.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "You do not have an account; signup?" });
    }

    else {
      const userCredentials = await signInWithEmailAndPassword(auth, email, password);
      const firebaseAccessToken = await userCredentials.user.email;
      // console.log(userCredentials.user.accessToken)
      console.log(firebaseAccessToken)
      console.log( email )
      return res.status(200).json({ message: "You have been successfully logged into your account", accessToken: firebaseAccessToken })
    }

  }
  catch (error) {

    const errorCode = error.code;
    const errorMessage = error.message;

    // If the error code is not null that eans that firebase has generated an error message when the user tried to log in 
    if (errorCode !== null) {
      console.error(errorMessage);
      return res.status(400).json({ message: "Incorrect email or password" });
    }

    console.error("Error occured while trying to login: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
})


// ENDPOINT USED FOR CHECKING USER ROLES WHEN THEY WANT TO ACCESS PAGES WITH RESTRICTED ACCESS
app.get("/isAuthorised/:email", async (req, res) => {
  try {
    const { email } = req.params;

    const collection = mongoose.connection.collection("users");
    console.log("Email destructured from isAuthorised endpoint: ",email)

    const user = await collection.findOne({ lowerCase: email });

    console.log("The authorised endpoint: ",user)

    if (!user) {
      return res.status(401).json({ message: "User is not signed in" })
    }

    else {
      return res.status(200).json({ role: user.role })
    }

  }
  catch (error) {
    console.error("Error authorising access: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});



// Endpoint for resetting a password from the users profile
app.put("/resetPassword", async (req, res) => {
  try {

    const { email, password, resetPassword, confirmPassword, userName } = req.body;

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
app.get("/myProfile/:email", async (req, res) => {
  try {

    const collection = await mongoose.connection.collection("users");
    const { email } = req.params;

    const user = await collection.findOne({ email })

    return res.status(200).json({ message: "Data successfully collected", userProfileInfo: user })

  } catch (error) {
    console.error("Unable to get user profile: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});



// Endpoint to get a record of all of the seats a user has ever booked using their email
app.get("/seatPaymentsHistory/:email", async (req, res) => {
  try {

    const collection = await mongoose.connection.collection("payments");
    const { email } = req.params

    // To make sure that the latest booking shows up first you need to use the .reverse() method in the CRUD function in the frontend
    const user = (await collection.find({ email }).toArray());

    if (!user) {
      return res.status(404).json({ message: "No booking history available" })
    }
    return res.status(200).json({ message: "Seat history successfully found", seatHistory: user })

  } catch (error) {
    console.error("Error getting Payment History: ", error);
    return res.status(500).json({ message: "Internal server Error" });
  }
});



// Endpoint used to get the user whose role we want to change 
app.get("/userByUserName/:email", async (req, res) => {
  try {

    const collection = mongoose.connection.collection("users");


    // We must first verify that the person who wants to access this information is an admin
    const { email } = req.params;

    const admin = await collection.findOne({ email })

    // Checking to make sure that the person who is trying to change a user's role is an admin
    if (!admin || admin.role !== "admin") {
      return res.status(401).json({ message: "You do not have authorised access to perform this task" });
    }

    const { userName } = req.body;

    const user = await collection.findOne({ userName });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    else {
      return res.status(200).json({ message: "User found.", userName: user.userName, role: user.role })
    }
  }
  catch (error) {
    console.error("Error finding user: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
})



// End used by an admin to make a user a venue manager
app.post("/changeUserRoles/:email", async (req, res) => {
  try {

    const { email } = req.params;

    const { userName, role } = req.body;

    const collection = await mongoose.connection.collection("users");

    const admin = await collection.findOne({ email });

    // Checking to make sure that the person who is trying to change a user's role is an admin

    if (!admin) {
      return res.status(401).json({ message: "You do not have authorised access to perform this task" });
    }

    else if (admin.role !== "admin") {
      return res.status(401).json({ message: "You do not have authorised access to perform this task" });
    }

    // Once it is confirmed that the person who is trying to change a users role is an admin, 
    // you can apply the new userRole to the required account 
    const user = await collection.findOne({ userName });

    if (!user) {
      return res.status(409).json({ message: "Unable to find user" });
    }

    else if (role == "manager") {
      const user = await collection.updateOne({ userName }, { $set: { role } });
      const change = await collection.findOne({ userName })
      return res.status(200).json({
        message: "User role has been successfully updated to manager", changedRole: change
      })
    }

    else if (role == "customer") {
      const user = await collection.updateOne({ userNarme }, { $set: { role } });
      const change = await collection.findOne({ userName })
      return res.status(200).json({
        message: "User role has been successfully updated to customer", changedRole: change
      })
    }

  } catch (error) {
    console.error("During changing the users role: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});



// End used by a user to book a seat at the cinema
app.post("/bookingSeat", async (req, res) => {
  try {

    const collection = await mongoose.connection.collection("payments");

    const { email, bookingPrice, eventDate, bookedBy, numberOfSeats, seatNumber, venueName, address } = req.body;
    // Do not need to have the userid validted but need the booking id counter to create the booking id for the event

    if (!bookingPrice || !eventDate || !bookedBy || !venueName || !address || !numberOfSeats || seatNumber) {
      return res.status(409).json({ message: "Please fill in all the required fields to finish booking your seat." });
    }

    else {

      const user = await collection.insertOne({
        ...req.body, createdAt: new Date()
      });

      return res.status(200).json({ message: "Seat has been successfully booked." })
    }

  } catch (error) {
    console.error("booking a seat endpoint: ", error);
    return res.status(500).json({ message: "Internal Server Error" });

  }
});



// End used by a manager to create a new venue that they own
app.post("/newVenue/:email",
  upload.fields([
    { name: "images", maxCount: 10 },
    { name: "documents", maxCount: 10 }
  ]),
  async (req, res) => {
    try {

      // Making sure that the user is a manager in order for tem to create and upload a new venue
      const usersCollection = await mongoose.connection.collection("users");

      const { email } = req.params;

      const admin = usersCollection.findOne({ email });

      if (!admin) {
        return res.status(401).json({ message: "You are not authorised to perform this action" });
      }

      else if (admin.role == "customer") {
        return res.status(401).json({ message: "You are not authorised to perform this action" });
      }

      const { venueName,
        number,
        registrationNo,
        address,
        documents,
        facilities,
        numberOfSeats,
        seatRows,
        seatColumns,
      } = req.body

      

      const images = req.files.images.map((imageObj) => {
        return {
          buffer: imageObj.buffer,
          size: imageObj.size
        }
      })

      const seatArrangement = [];
      let seatNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

      for (let i = 0; i < parseInt(seatRows); i++) {
        let arr = []
        let rowNumber = seatNames[i];
        for (let j = 0; j < parseInt(seatColumns); j++) {
          let seat = {
            seat: `${rowNumber}${j+1}`,
            isBooked: false
          };
          arr.push(seat);
        }
        seatArrangement.push(arr);

      }



      if (!venueName || !numberOfSeats || !address /*|| !ownerInformation || !pricePerSeat || !seatArrangement*/) {
        return res.status(400).json({ message: "Please fill in the necessary information to create and event." });
      }
      else {

        const venueCollection = mongoose.connection.collection("venues");
        await venueCollection.insertOne({ ...req.body, seatArrangement:seatArrangement, email:email, images:images, createdAt: new Date() })
        return res.status(200).json({ message: "Vanue has been successfully created." });
      }
    } catch (error) {
      console.error("There was an error trying to upload a new user: ", error);
      return res.status(500).json({ message: "Internal Server Error" })
    }
  });




// 6 endpoints left





// Endpoint used to delete a venue that will no longer be shown on the app
app.delete("/removeMyVenue/venueName", async (req, res) => {
  try {
    const { venueName } = req.params
    const collection = mongoose.connection.collection("venues");
    const venue = await collection.findOne({ venueName })

    if (!venue) {
      return res.status(404).json({ message: "Venue does not exist." });
    } else {
      await collection.deleteOne({ venueName });
      return res.status(200).json({ message: "Venue successfully deleted." });
    }
  } catch (error) {
    console.error("Error deleting a venue: ", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
});



// Endpoint used to update the information of an existing venue
app.put("/venueUpdate", async (req, res) => {
  try {
  }
  catch (error) {
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
    const collection = mongoose.connection.collection("events");
    const events = await collection.find({}).toArray();

    if(events.length === 0){
      return res.status(404).json({ message: [{venue:"There are no upcoming events"}]});
    }

    else {
      return res.status(200).json({message: events });
    }
  } catch (error) {
console.error("There was an error trying to fetch all ofthe upcoming events: ",error);
return res.status(500).json({message:"Internal Server Error"})
  }
});



// Endpoint used to post review forms
app.post("/postForms", async (req, res) => {

  try {
    const { email, subject } = req.body;
    const collection = mongoose.connection.collection("forms");

    if (!email || !subject) {
      return res.status(404).json({ message: "Email and subject are required" });
    }

    const result = await collection.insertOne({ ...req.body, createdAt: new Date() });

    return res.status(201).json({ message: "Your form has been sent and received by administration" });
  } catch (error) {
    console.error("Unable to send and store the request", error);
    return res.status(500).json({ message: "Intenral server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
