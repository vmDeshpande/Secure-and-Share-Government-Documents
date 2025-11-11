const express = require('express');
const app = express();
const path = require('path');
const dotenv = require('dotenv');
const session = require('express-session');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const secretKey = crypto.randomBytes(64).toString('hex');
const multer = require('multer');
const { GridFSBucket, ObjectId } = require('mongodb');
const User = require('../public/models/userModel');
const connectDB = require('../public/config/db');

dotenv.config();
connectDB();
app.use(session({
    secret: secretKey,
    resave: false,
    saveUninitialized: true,
}));
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(express.json());
app.get('/', async (req, res) => {
    res.sendFile(__dirname + '/index.html')
});

app.get('/check-auth-status', (req, res) => {
    const isAuthenticated = req.session.user;

    const isUser = req.session.user !== undefined;

    res.json({ isAuthenticated, isUser });
});

app.post('/register/user', async (req, res) => {
    const { name, contact, email, aadhar_number, password } = req.body;

    try {
      const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({
            name,
            contact,
            email,
            aadhar_number,
            password: hashedPassword,
            documents: [],
        });

        await newUser.save();
        res.json({ message: 'User registration successful' });
    } catch (error) {
        res.status(500).json({ message: 'Registration failed', error: error.message });
    }
});

app.post('/login/user', async (req, res) => {
    const { loginWay, password } = req.body;

    try {
        // Determine if loginWay is email or phone
        const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(loginWay);
        let query = {};

        if (isEmail) {
            query.email = loginWay.toLowerCase();
        } else {
            query.contact = loginWay;
        }

        const user = await User.findOne(query);

        if (user && await bcrypt.compare(password, user.password)) {
            req.session.user = user;
            res.json({ message: 'User login successful' });
        } else {
            res.status(401).json({ message: 'Invalid credentials' });
        }

    } catch (error) {
        res.status(500).json({ message: 'Login failed', error: error.message });
    }
});

app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Error destroying session:', err);
            res.status(500).json({ message: 'Logout failed' });
        } else {
            res.json({ message: 'Logout successful' });
        }
    });
});

const upload = multer();

// Upload document
app.post('/upload', upload.single('document'), async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ message: 'Unauthorized' });
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'documents' });
    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });

    uploadStream.end(req.file.buffer);

    uploadStream.on('finish', async () => {
      const fileId = uploadStream.id; // This is mongodb ObjectId

      const newDoc = {
        name: req.file.originalname,
        fileType: req.file.mimetype,
        uploadDate: new Date(),
        file: fileId, // Save exactly the ObjectId returned by GridFS
      };

      // Push to user's documents array
      await User.findByIdAndUpdate(user._id, {
        $push: { documents: newDoc },
      });

      res.json({ message: 'Document uploaded successfully', doc: newDoc });
    });

    uploadStream.on('error', (err) => {
      console.error(err);
      res.status(500).json({ message: 'Upload failed', error: err.message });
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});



// Fetch all documents of the logged-in user
app.get('/user/documents', async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) {
      return res.status(401).json({ message: 'Unauthorized: Please log in' });
    }

    // Fetch the latest user data from the DB (to get updated documents)
    const dbUser = await User.findById(user._id);
    if (!dbUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Return the documents array
    res.json({ documents: dbUser.documents || [] });
  } catch (err) {
    console.error('Error fetching documents:', err);
    res.status(500).json({ message: 'Failed to load documents', error: err.message });
  }
});

app.get('/file/:id', async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const bucket = new GridFSBucket(mongoose.connection.db, {
      bucketName: 'documents', // ✅ same bucket name used in upload
    });

    // Check if file exists
    const files = await mongoose.connection.db
      .collection('documents.files')
      .find({ _id: fileId })
      .toArray();

    if (!files || files.length === 0) {
      return res.status(404).json({ message: 'File not found' });
    }

    res.set('Content-Type', files[0].contentType);
    const downloadStream = bucket.openDownloadStream(fileId);
    downloadStream.pipe(res);

    downloadStream.on('error', (err) => {
      console.error('Stream error:', err);
      res.status(404).json({ message: 'Error reading file' });
    });
  } catch (err) {
    console.error('File route error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// Delete a document

app.delete('/document/:subDocId', async (req, res) => {
  try {
    const userId = req.session.user?._id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const subDocId = req.params.subDocId;
    if (!mongoose.Types.ObjectId.isValid(subDocId))
      return res.status(400).json({ message: 'Invalid document ID' });

    // Find user
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Find subdocument in user's documents array
    const doc = user.documents.id(subDocId);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    const bucket = new GridFSBucket(mongoose.connection.db, { bucketName: 'documents' });

    // 1️⃣ Delete from GridFS
    await new Promise((resolve, reject) => {
      bucket.delete(doc.file, (err) => { // use GridFS ObjectId
        if (err) return reject(err);
        resolve();
      });
    });

    // 2️⃣ Delete from user's documents array
    doc.remove();       // remove subdocument from array
    await user.save();  // persist changes

    res.json({ message: 'Document deleted successfully', documents: user.documents });

  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});











const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
