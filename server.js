import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import multer from "multer";
import cors from 'cors';
import { auth } from "./firebase.js";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { signInWithEmailAndPassword } from "firebase/auth";
import { uploadImages, uploadDocuments } from "./supabase.js";

dotenv.config();

// Multer set up
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Supabase setup
process.env.SUPABASE_URL
process.env.SUPABASE_SECRET_KEY

// PayStack setup
const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

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

      // Signing up a user to firebase first before saving their email in mongo DB
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
        actualName:userName,
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
    console.log("The email from thefrontend: ", email)
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
      console.log(userCredentials.user.accessToken)
      // console.log(firebaseAccessToken)
      // console.log( email )
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
    console.log("Email destructured from isAuthorised endpoint: ", email)

    const user = await collection.findOne({ lowerCase: email });

    console.log("The authorised endpoint: ", user)

    if (!user) {
      return res.status(401).json({ message: "User is not signed in" })
    }

    else {
      return res.status(200).json({ role: user.role, userName: user.userName })
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
      const user = await collection.updateOne({ lowerCase: email }, { $set: { password: resetPassword } });
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

    const user = await collection.findOne({ lowerCase: email })

    return res.status(200).json({ message: "Data successfully collected", userProfileInfo: user })

  } catch (error) {
    console.error("Unable to get user profile: ", error);
    return res.status(500).json({ message: "Internal server error" });
  }
});



// Endpoint to get a record of all of the seats a user has ever booked using their email
app.get("/seatPaymentsHistory/:email", async (req, res) => {
  try {

    const collection = mongoose.connection.collection("payments");
    const { email } = req.params

    // To make sure that the latest booking shows up first you need to use the .reverse() method in the CRUD function in the frontend
    const user = await collection.find({ bookedBy: email }).toArray();

    if (user.length === 0) {
      return res.status(404).json({
        message: "No booking history available", seatHistory: [{
          venueName: "You do not have any booking history available",
          _id: "err"
        }]
      })
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

    const admin = await collection.findOne({ lowerCase: email })

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

    const admin = await collection.findOne({ lowerCase: email });

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

      const admin = await usersCollection.findOne({ email });

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
        facilities,
        numberOfSeats,
        seatRows,
        seatColumns,
      } = req.body

      const images = await Promise.all(req.files.images.map(async (imageObj) => {

        const oneImageObj = {
          ...imageObj
        }

        // console.log(oneImageObj)

        const supabaseImages = await uploadImages(oneImageObj);
        // console.log("What is supabase returning: ", supabaseImages)
        return supabaseImages;
      }))

       const documents = await Promise.all(req.files.documents.map(async (documentObj) => {

        const oneDocumentObj = {
          ...documentObj
        }

        const supabaseDocuments = await uploadDocuments(oneDocumentObj);
        // console.log("What is supabase returning: ", supabaseDocuments)
        return supabaseDocuments;
      }))

      // console.log("The variable that should hold everything being mapped through: ", images)


      const seatArrangement = [];
      let seatNames = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L", "M", "N", "O", "P", "Q", "R", "S", "T", "U", "V", "W", "X", "Y", "Z"];

      for (let i = 0; i < parseInt(seatRows); i++) {
        let arr = []
        let rowNumber = seatNames[i];
        for (let j = 0; j < parseInt(seatColumns); j++) {
          let seat = {
            seat: `${rowNumber}${j + 1}`,
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
        await venueCollection.insertOne({ ...req.body, seatArrangement: seatArrangement, email, images, documents, createdAt: new Date() })
        return res.status(200).json({ message: "Vanue has been successfully created." });
      }
    } catch (error) {
      console.error("There was an error trying to upload a new user: ", error);
      return res.status(500).json({ message: "Internal Server Error" })
    }
  });

// ENDPOINT USED TO GET ALL OF THE VENUES AND DISPLAY THEM TO MANAGERS AND ADMINS
app.get("/allVenues", async (req, res) => {

  try{

  const collection = mongoose.connection.collection("venues");
  const allVenues = await collection.find().toArray();

  console.log("Number of venues inside the database: ", allVenues.length)
 
  return res.status(200).json({ message: allVenues });

  } catch (error) {
    console.error("There was an error trying to get all of the venues: ",error);
    return res.status(500).json({ message:"Internal server error" });
  }
})

app.get("/myVenues/:email", async(req,res) =>{
  try{
    const { email } = req.params;

    const collection = mongoose.connection.collection("venues");
    const personalVenues = await collection.find({ email }).toArray();
 
    console.log("Number of personal venues inside the database: ", personalVenues.length)
    
    if( personalVenues ){
return res.status(200).json({ message: personalVenues });
    }
     else{
return res.status(200).json({ message: "Unable to collect venues, does user have any created venues available." });
    }

  } catch (error) {
    console.error("Error while trying to get a managers personal venues", error);
    res.status(500).json({ message: "Internal server error" })
  }
})



// 6 endpoints left



// Endpoint used to delete a venue 
app.delete("/removeMyVenue/:venueName", async (req, res) => {
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
app.post("/bookVenue/:email", async (req, res) => {
  try {

    const { venueName, eventDate } = req.body;

    const { email } = req.params;
const userCollections = mongoose.connection.collection("users");
const collection = mongoose.connection.collection("events");

const user = await userCollections.findOne({ lowerCase: email });

if(!user){
  return res.status(404).json({ message: "Unable to perform this action because you are not logged in. Log out, log in again and try to perform the action again" });
}
else if( user.role === "customer"){
  return res.status(404).json({ message: "Does not seem like you have no authorization to perform action, contact the reception for inquiries." });
}

console.log("Venue being booked: ", req.body.venueName);

// Finding all of the events this veue has been booked for
const events = await collection.find({ venueName }).toArray();


// console.log( "all the event that are upcoming for that venue:",events)

// Checking to see if the venue is about to be doublebooked
const doubleBooking = await events.filter((item)=>{ return item.eventDate === eventDate });
// console.log( "all the event that are being double booked :",doubleBooking)
if( doubleBooking.length != 0 ){
return res.status(409).json({ message:"The venue has already been booked on this particular day please select a different date to host your event "});
}
else{
  
  // removing the propertys unique id so that only the mongodb one doesnt clash with the original one. 
  delete req.body["_id"];

const update = await collection.insertOne({ ...req.body });
console.log( "Event successfully created ");
return res.status(200).json({ message: "Event has been successfully created and booked "});
}

  }
   catch (error) {
console.error("Error trying to book a venue and create a neww event: ", error);
return res.status(500).json({ message:"Internal server error, please try again later"})
  }
});



// Edit an event that is already public
app.put("/editUpcomingEvent", async (req, res) => {
  try {
    
  } catch (error) {

  }
});

// Jesicas endpoint called routes
app.put("/routes", async (req, res) => {
  try {
    
  } catch (error) {

  }
});

// PayStack endpoints

app.post('/api/paystack/initialize', async (req, res) => {
  try {
    const { email, amount } = req.body;

    const response = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      { email, amount },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});

// Verify Transaction

app.get('/api/paystack/verify/:reference', async (req, res) => {
  const { reference } = req.params;
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    res.status(200).json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response?.data || error.message });
  }
});


// Endpoint used to get all the events that are coming to display it
app.get("/upcomingEvent", async (req, res) => {
  try {
    const collection = mongoose.connection.collection("events");
    const events = await collection.find({}).toArray();

    if (events.length === 0) {
      return res.status(404).json({ message: [{ venue: "There are no upcoming events" }] });
    }

    else {
      return res.status(200).json({ message: events });
    }

  } catch (error) {
    console.error("There was an error trying to fetch all ofthe upcoming events: ", error);
    return res.status(500).json({ message: "Internal Server Error" })
  }
});



// Endpoint used to post review forms
app.post("/postForms", async (req, res) => {

  try {
    const { fullName, email, message } = req.body;
    const collection = mongoose.connection.collection("forms");

    if (!fullName || !email || !message) {
      return res.status(404).json({ message: "Please fill in all of the inputs below in order your form to be submitted" });
    }

    const result = await collection.insertOne({ ...req.body, createdAt: new Date() });

    return res.status(200).json({ message: "Your form has been sent and received by administration" });
  } catch (error) {
    console.error("Unable to send and store the request", error);
    return res.status(500).json({ message: "Intenral server error, please try again later" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
