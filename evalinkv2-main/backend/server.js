const express = require('express');
const mysql = require('mysql2/promise'); // Use the promise-based version
const bcrypt = require('bcrypt');
const cors = require('cors');

// For file uploads
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const PDFDocument = require('pdfkit'); // Import PDFDocument

const app = express();
app.use(cors());
app.use(express.json());

// Serve static files (like uploaded images) from the 'public' directory
// --- PDF HELPER FUNCTIONS (Moved to global scope) ---
const addHeader = (doc, title) => {
  // Add logo if it exists
  try {
    doc.image('public/images/evalinklogo.png', 50, 40, { width: 50 });
  } catch (err) {
    console.log("Could not find logo file. Skipping...");
  }

  doc.fontSize(20).font('Helvetica-Bold').text(title, 50, 57, { align: 'center' });
  doc.fontSize(10).font('Helvetica').text(`Report Generated: ${new Date().toLocaleDateString()}`, 50, 80, { align: 'center' });
  doc.moveDown(4);
};

const addFooter = (doc) => {
  const range = doc.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    doc.switchToPage(i);
    // Add a horizontal line at the bottom
    doc.lineCap('butt').moveTo(50, doc.page.height - 70).lineTo(doc.page.width - 50, doc.page.height - 70).stroke('#cccccc');
    doc.fontSize(8).font('Helvetica').text(`Page ${i + 1} of ${range.count}`, 50, doc.page.height - 60, { align: 'center' });
  }
};

const drawSummaryBox = (doc, average, respondents) => {
  const boxWidth = doc.page.width - 100;
  const boxY = doc.y;
  doc.rect(doc.x, boxY, boxWidth, 40).fillAndStroke('#f3f4f6', '#e5e7eb');
  doc.fillColor('#374151').font('Helvetica-Bold');
  doc.text('Overall Average:', doc.x + 10, boxY + 15, { width: boxWidth / 2 - 20, continued: true });
  doc.font('Helvetica').text(` ${average.toFixed(2)} / 5.00`);
  doc.fillColor('#374151').font('Helvetica-Bold');
  doc.text('Total Respondents:', doc.x + boxWidth / 2, boxY + 15, { continued: true });
  doc.font('Helvetica').text(` ${respondents}`);
  doc.moveDown(2);
};

const drawComments = (doc, comments) => {
  if (comments && comments.length > 0) {
    doc.fontSize(12).font('Helvetica-Bold').text('Feedback Comments', 50, doc.y);
    doc.moveDown(0.5);
    doc.font('Helvetica-Oblique').list(comments.map(c => `"${c}"`), {
      bulletRadius: 2, textIndent: 10, indent: 20
    });
    doc.moveDown();
  }
};

const drawDetailedRatings = (doc, categories) => {
  doc.fontSize(12).font('Helvetica-Bold').text('Detailed Ratings', 50, doc.y);
  doc.moveDown(1);

  categories.forEach(category => {
    doc.fontSize(12).font('Helvetica-Bold').fillColor('#1b1464').text(category.category_name, 50, doc.y);
    doc.moveDown(0.5);

    const tableTop = doc.y;
    const questionX = 50;
    const ratingX = 500;

    // Table drawing logic (header, rows, zebra-striping)
    doc.font('Helvetica-Bold').fontSize(10);
    doc.rect(questionX, tableTop, ratingX - questionX + 50, 20).fill('#e5e7eb');
    doc.fillColor('#1f2937').text('Question', questionX + 5, tableTop + 6);
    doc.text('Rating', ratingX, tableTop + 6, { width: 50, align: 'right' });
    doc.y += 5;

    let i = 0;
    category.questions.forEach(q => {
      const rowY = doc.y;
      const rowHeight = Math.max(20, doc.heightOfString(q.question_text, { width: ratingX - questionX - 10 }) + 10);

      if (i % 2) {
        doc.rect(questionX, rowY, ratingX - questionX + 50, rowHeight).fill('#f9fafb');
      }

      doc.font('Helvetica').fontSize(9).fillColor('#374151').text(q.question_text, questionX + 5, rowY + 6, { width: ratingX - questionX - 10 });
      doc.font('Helvetica-Bold').text(q.average_rating.toFixed(2), ratingX, rowY + 6, { width: 50, align: 'right' });
      doc.y = rowY + rowHeight;
      i++;
    });
    doc.moveDown();
  });
};
// --- END PDF HELPER FUNCTIONS ---

app.use(express.static('public'));
// Use a connection pool for better performance and resource management
const dbPool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'evalink', // Corrected to match the database we created
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadPath = 'public/uploads/profiles/';
        // Ensure this directory exists, creating it if it doesn't.
        fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: function (req, file, cb) {
        // Create a unique filename to avoid overwrites
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

/**
 * Checks if a default admin user exists and creates one if not.
 * This function is safe to run on every server start.
 */
async function createAdminIfNotExists() {
    let connection;
    try {
        connection = await dbPool.getConnection();
        const adminEmail = 'admin';
        const adminPassword = 'admin123';
        const adminName = 'Administrator';
        const saltRounds = 10;

        const [rows] = await connection.execute('SELECT email FROM users WHERE email = ?', [adminEmail]);

        if (rows.length > 0) {
            console.log(`Admin user "${adminEmail}" already exists. Skipping creation.`);
            return;
        }

        console.log(`Admin user "${adminEmail}" not found. Creating...`);
        const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);
        const insertQuery = `INSERT INTO users (id, name, email, password, role) VALUES (?, ?, ?, ?, 'admin')`;
        await connection.execute(insertQuery, [adminEmail, adminName, adminEmail, hashedPassword]);
        console.log(`✅ Admin user "${adminEmail}" created successfully!`);

    } catch (error) {
        console.error('❌ Error during admin user setup:', error.message);
    } finally {
        if (connection) connection.release();
    }
}

// Helper function to log activity
async function logActivity(userId, activityType, description) {
    try {
        const sql = "INSERT INTO activity_logs (user_id, activity_type, description) VALUES (?, ?, ?)";
        await dbPool.execute(sql, [userId, activityType, description]);
    } catch (error) {
        console.error(`Failed to log activity: ${error.message}`);
    }
}

app.get('/', (req, res) => {
    return res.json('Hello from the backend server!');
});

// --- AUTH ENDPOINTS ---

app.post('/login', async (req, res) => {
    try {
        const { email, id, password } = req.body;

        if ((!email && !id) || !password) {
            return res.status(400).json({ error: "Identifier and password are required" });
        }

        let sql;
        let params;

        if (email) {
            // Admin login using email as the username
            sql = "SELECT * FROM users WHERE email = ? AND role = 'admin'";
            params = [email];
        } else {
            // Student/Faculty login using ID
            sql = "SELECT * FROM users WHERE id = ?";
            params = [id];
        }

        const [rows] = await dbPool.execute(sql, params);

        if (rows.length === 0) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) {
            return res.status(401).json({ error: "Invalid credentials" });
        }

        // Log the login activity (fire-and-forget)
        logActivity(user.id, 'login', 'User logged in successfully.');

        // On success, return user info (excluding password)
        const { password: _, ...userInfo } = user;
        return res.status(200).json({ message: "Login successful", user: userInfo });

    } catch (error) {
        console.error("Error during login:", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});

// --- USER MANAGEMENT ENDPOINTS ---

app.get('/users', async (req, res) => {
    try {
        const role = req.query.role;
        if (!role) {
            return res.status(400).json({ error: "Role query parameter is required" });
        }

        const sql = `
        SELECT u.id, u.name, u.email, u.year_level, u.section_id, u.profile_image_url, d.name as department_name 
        FROM users u
        LEFT JOIN departments d ON u.department_id = d.id
        WHERE u.role = ?
        ORDER BY u.name ASC`;
        const [rows] = await dbPool.execute(sql, [role]);
        return res.json(rows);
    } catch (error) {
        console.error(`Error fetching users:`, error);
        return res.status(500).json({ error: `Failed to fetch users` });
    }
});

app.get('/users/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT u.id, u.name, u.email, u.role, u.year_level, u.section_id, u.profile_image_url, d.name as department_name 
            FROM users u
            LEFT JOIN departments d ON u.department_id = d.id
            WHERE u.id = ?`;
        const [rows] = await dbPool.execute(sql, [id]);

        if (rows.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        // Return user info, excluding password if it were selected
        return res.json(rows[0]);
    } catch (error) {
        console.error(`Error fetching user:`, error);
        return res.status(500).json({ error: `Failed to fetch user` });
    }
});

app.post('/users', async (req, res) => {
    try {
        const { id, name, email, password, role, department_id, section_id, year_level } = req.body;
        // Assuming admin actions are not tied to a specific user in this context for logging
        // In a real app, you'd get the admin's ID from a token.
        const adminId = req.body.adminId || 'admin'; // Fallback to 'admin'
        const hashedPassword = await bcrypt.hash(password.toString(), 10);

        const sql = "INSERT INTO users (`id`, `name`, `email`, `password`, `role`, `department_id`, `section_id`, `year_level`) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
        const values = [id, name, email, hashedPassword, role, department_id, section_id || null, year_level || null];

        const [result] = await dbPool.execute(sql, values);
        logActivity(adminId, 'create_user', `Created new ${role}: ${name} (${id})`);
        return res.status(201).json({ message: "User added successfully", userId: result.insertId });
    } catch (error) {
        console.error("Error adding user:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "A user with this email already exists." });
        }
        return res.status(500).json({ error: "Failed to add user" });
    }
});

// UPDATE a user (student or faculty) - CONSOLIDATED AND FIXED
app.put('/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, password, department_id, year_level, section_id, role } = req.body;
    const adminId = req.body.adminId || 'admin';

    try {
        // Build the update query dynamically
        let updateFields = ['name = ?', 'email = ?', 'department_id = ?'];
        let params = [name, email, department_id];

        // Add role-specific fields if the user is a student
        if (role === 'student') {
            updateFields.push('year_level = ?');
            params.push(year_level);
            updateFields.push('section_id = ?');
            params.push(section_id || null);
        }

        // Handle optional password update
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateFields.push('password = ?');
            params.push(hashedPassword);
        }

        // Finalize the SQL query
        params.push(id); // Add the user ID for the WHERE clause
        const sql = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;

        const [result] = await dbPool.execute(sql, params);

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found." });
        }

        logActivity(adminId, 'update_user', `Updated user profile for ${role} ID: ${id}`);
        res.json({ message: "User updated successfully!" });
    } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).json({ error: "Failed to update user." });
    }
});

app.delete('/users/:id', async (req, res) => {
    const { id } = req.params;
    const adminId = req.body?.adminId || 'admin';
    const connection = await dbPool.getConnection();

    try {
        await connection.beginTransaction();

        // Delete related records first
        await connection.execute("DELETE FROM activity_logs WHERE user_id = ?", [id]);
        await connection.execute("DELETE FROM incidents WHERE student_id = ?", [id]);
        await connection.execute("DELETE FROM student_subjects WHERE student_id = ?", [id]);
        await connection.execute("DELETE FROM faculty_subjects WHERE faculty_id = ?", [id]);

        // For evaluations, we need to delete answers first
        const [evaluations] = await connection.execute("SELECT id FROM evaluations WHERE student_id = ? OR faculty_id = ?", [id, id]);
        if (evaluations.length > 0) {
            const evaluationIds = evaluations.map(e => e.id);
            await connection.query("DELETE FROM evaluation_answers WHERE evaluation_id IN (?)", [evaluationIds]);
            await connection.query("DELETE FROM evaluations WHERE id IN (?)", [evaluationIds]);
        }

        // Finally, delete the user
        const [result] = await connection.execute("DELETE FROM users WHERE id = ?", [id]);
        await connection.commit();
        
        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "User not found" });
        }
        logActivity(adminId, 'delete_user', `Deleted user with ID: ${id}`);
        return res.json({ message: "User deleted successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("Error deleting user:", error);
        return res.status(500).json({ error: "Failed to delete user." });
    } finally {
        if (connection) connection.release();
    }
});

// New endpoint for uploading a profile image
app.post('/users/:id/profile-image', upload.single('profileImage'), async (req, res) => {
    const { id } = req.params;
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded.' });
    }

    // The path to be stored in the DB, relative to the server root
    const imageUrl = `/uploads/profiles/${req.file.filename}`;

    try {
        const sql = "UPDATE users SET profile_image_url = ? WHERE id = ?";
        await dbPool.execute(sql, [imageUrl, id]);

        // Log activity
        logActivity(id, 'update_profile', 'User updated their profile picture.');
        res.json({ message: 'Profile image updated successfully', imageUrl });
    } catch (error) {
        console.error("Error updating profile image:", error);
        res.status(500).json({ error: 'Database error while updating profile image.' });
    }
});

// --- DEPARTMENT ENDPOINTS ---

app.get('/departments', async (req, res) => {
    try {
        const sql = "SELECT * FROM departments ORDER BY name ASC";
        const [rows] = await dbPool.query(sql);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching departments:", error);
        return res.status(500).json({ error: "Failed to fetch departments" });
    }
});

app.post('/departments', async (req, res) => {
    try {
        const { name } = req.body;
        const adminId = req.body.adminId || 'admin';
        const sql = "INSERT INTO departments (`name`) VALUES (?)";
        const [result] = await dbPool.execute(sql, [name]);
        logActivity(adminId, 'create_department', `Added department: ${name}`);
        return res.status(201).json({ message: "Department added successfully", departmentId: result.insertId });
    } catch (error) {
        console.error("Error adding department:", error);
        return res.status(500).json({ error: "Failed to add department" });
    }
});

app.put('/departments/:id', async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    const adminId = req.body.adminId || 'admin';

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: "Department name is required." });
    }

    try {
        const [result] = await dbPool.execute('UPDATE departments SET name = ? WHERE id = ?', [name, id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "Department not found." });
        logActivity(adminId, 'update_department', `Updated department ID ${id} to name: ${name}`);
        res.json({ message: "Department updated successfully!" });
    } catch (error) {
        console.error("Error updating department:", error);
        res.status(500).json({ error: "Failed to update department." });
    }
});

app.delete('/departments/:id', async (req, res) => {
    const { id } = req.params;
    const adminId = req.body?.adminId || 'admin';
    const connection = await dbPool.getConnection();

    try {
        await connection.beginTransaction();
        // Set related fields to NULL before deleting the department
        await connection.execute("UPDATE users SET department_id = NULL WHERE department_id = ?", [id]);
        await connection.execute("UPDATE sections SET department_id = NULL WHERE department_id = ?", [id]);
        await connection.execute("UPDATE subjects SET department_id = NULL WHERE department_id = ?", [id]);

        await connection.execute("DELETE FROM departments WHERE id = ?", [id]);
        await connection.commit();
        logActivity(adminId, 'delete_department', `Deleted department with ID: ${id}`);
        return res.json({ message: "Department deleted successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("Error deleting department:", error);
        return res.status(500).json({ error: "Failed to delete department. It might be in use." });
    } finally {
        if (connection) connection.release();
    }
});

// --- SECTION ENDPOINTS ---

app.get('/sections', async (req, res) => {
    try {
        const sql = `
        SELECT s.id, s.name, s.year_level, d.name as department_name
        FROM sections s
        LEFT JOIN departments d ON s.department_id = d.id
        ORDER BY s.name ASC`;
        const [rows] = await dbPool.query(sql);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching sections:", error);
        return res.status(500).json({ error: "Failed to fetch sections" });
    }
});

app.post('/sections', async (req, res) => {
    try {
        const { name, department_id, year_level } = req.body;
        const adminId = req.body.adminId || 'admin';
        const sql = "INSERT INTO sections (`name`, `department_id`, `year_level`) VALUES (?, ?, ?)";
        const [result] = await dbPool.execute(sql, [name, department_id, year_level]);
        logActivity(adminId, 'create_section', `Added section: ${name}`);
        return res.status(201).json({ message: "Section added successfully", sectionId: result.insertId });
    } catch (error) {
        console.error("Error adding section:", error);
        return res.status(500).json({ error: "Failed to add section" });
    }
});

app.put('/sections/:id', async (req, res) => {
    const { id } = req.params;
    const { name, department_id, year_level } = req.body;
    const adminId = req.body.adminId || 'admin';

    if (!name || !department_id || !year_level) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const sql = 'UPDATE sections SET name = ?, department_id = ?, year_level = ? WHERE id = ?';
        const [result] = await dbPool.execute(sql, [name, department_id, year_level, id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "Section not found." });
        logActivity(adminId, 'update_section', `Updated section ID ${id}`);
        res.json({ message: "Section updated successfully!" });
    } catch (error) {
        console.error("Error updating section:", error);
        res.status(500).json({ error: "Failed to update section." });
    }
});

app.get('/users/:id/sections', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT 
                fs.section_id,
                fs.subject_id,
                sec.name as section_name,
                sub.name as subject_name,
                sub.code as subject_code
            FROM faculty_subjects fs
            JOIN sections sec ON fs.section_id = sec.id
            JOIN subjects sub ON fs.subject_id = sub.id
            WHERE fs.faculty_id = ?
            ORDER BY sec.name, sub.name;
        `;
        const [rows] = await dbPool.execute(sql, [id]);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching faculty sections:", error);
        return res.status(500).json({ error: "Failed to fetch faculty sections" });
    }
});

app.delete('/sections/:id', async (req, res) => {
    const { id } = req.params;
    const adminId = req.body?.adminId || 'admin';
    const connection = await dbPool.getConnection();

    try {
        await connection.beginTransaction();
        // Remove section associations before deleting it
        await connection.execute("UPDATE users SET section_id = NULL WHERE section_id = ?", [id]);
        await connection.execute("DELETE FROM faculty_subjects WHERE section_id = ?", [id]);
        await connection.execute("UPDATE student_subjects SET section_id = NULL WHERE section_id = ?", [id]);
        
        await connection.execute("DELETE FROM sections WHERE id = ?", [id]);
        await connection.commit();
        logActivity(adminId, 'delete_section', `Deleted section with ID: ${id}`);
        return res.json({ message: "Section deleted successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("Error deleting section:", error);
        return res.status(500).json({ error: "Failed to delete section" });
    } finally {
        if (connection) connection.release();
    }
});

// --- SUBJECT ENDPOINTS ---

app.get('/subjects', async (req, res) => {
    try {
        const sql = `
            SELECT 
                s.id, s.code, s.name, s.year_level, 
                d.name as department_name,
                GROUP_CONCAT(f.name) as faculty_name
            FROM subjects s
            LEFT JOIN departments d ON s.department_id = d.id
            LEFT JOIN faculty_subjects fs ON s.id = fs.subject_id
            LEFT JOIN users f ON fs.faculty_id = f.id AND f.role = 'faculty'
            GROUP BY s.id
            ORDER BY s.code ASC`;
        const [rows] = await dbPool.query(sql);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching subjects:", error);
        return res.status(500).json({ error: "Failed to fetch subjects" });
    }
});

app.post('/subjects', async (req, res) => {
    try {
        const { code, name, department_id, year_level } = req.body;
        const adminId = req.body.adminId || 'admin';
        const sql = "INSERT INTO subjects (`code`, `name`, `department_id`, `year_level`) VALUES (?, ?, ?, ?)";
        const [result] = await dbPool.execute(sql, [code, name, department_id, year_level]);
        logActivity(adminId, 'create_subject', `Added subject: ${name} (${code})`);
        return res.status(201).json({ message: "Subject added successfully", subjectId: result.insertId });
    } catch (error) {
        console.error("Error adding subject:", error);
        return res.status(500).json({ error: "Failed to add subject" });
    }
});

app.put('/subjects/:id', async (req, res) => {
    const { id } = req.params;
    const { code, name, department_id, year_level } = req.body;
    const adminId = req.body.adminId || 'admin';

    if (!code || !name || !department_id || !year_level) {
        return res.status(400).json({ error: "All fields are required." });
    }

    try {
        const sql = 'UPDATE subjects SET code = ?, name = ?, department_id = ?, year_level = ? WHERE id = ?';
        const [result] = await dbPool.execute(sql, [code, name, department_id, year_level, id]);
        if (result.affectedRows === 0) return res.status(404).json({ error: "Subject not found." });
        logActivity(adminId, 'update_subject', `Updated subject ID ${id}`);
        res.json({ message: "Subject updated successfully!" });
    } catch (error) {
        console.error("Error updating subject:", error);
        res.status(500).json({ error: "Failed to update subject." });
    }
});

app.delete('/subjects/:id', async (req, res) => {
    const { id } = req.params;
    const adminId = req.body?.adminId || 'admin';
    const connection = await dbPool.getConnection();

    try {
        await connection.beginTransaction();

        // Delete all related records from junction/linking tables
        await connection.execute("DELETE FROM faculty_subjects WHERE subject_id = ?", [id]);
        await connection.execute("DELETE FROM student_subjects WHERE subject_id = ?", [id]);

        // Find and delete related evaluations and their answers
        const [evaluations] = await connection.execute("SELECT id FROM evaluations WHERE subject_id = ?", [id]);
        if (evaluations.length > 0) {
            const evaluationIds = evaluations.map(e => e.id);
            await connection.query("DELETE FROM evaluation_answers WHERE evaluation_id IN (?)", [evaluationIds]);
            await connection.query("DELETE FROM evaluations WHERE id IN (?)", [evaluationIds]);
        }

        // Finally, delete the subject itself
        await connection.execute("DELETE FROM subjects WHERE id = ?", [id]);
        await connection.commit();
        logActivity(adminId, 'delete_subject', `Deleted subject with ID: ${id}`);
        return res.json({ message: "Subject deleted successfully" });
    } catch (error) {
        await connection.rollback();
        console.error("Error deleting subject:", error);
        return res.status(500).json({ error: "Failed to delete subject. It might be in use." });
    } finally {
        if (connection) connection.release();
    }
});

// --- FACULTY LOAD (ASSIGNMENT) ENDPOINTS ---

app.get('/faculty-loads', async (req, res) => {
    try {
        const sql = `
            SELECT 
                CONCAT(fs.faculty_id, '-', fs.subject_id, '-', fs.section_id) as id,
                u.id as faculty_id,
                s.id as subject_id,
                sec.id as section_id,
                u.name as faculty_name,
                s.name as subject_name,
                sec.name as section_name,
                d.name as department_name
            FROM faculty_subjects fs
            JOIN users u ON fs.faculty_id = u.id
            JOIN subjects s ON fs.subject_id = s.id
            JOIN sections sec ON fs.section_id = sec.id
            JOIN departments d ON s.department_id = d.id
            ORDER BY u.name, s.name;
        `;
        const [rows] = await dbPool.query(sql);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching faculty loads:", error);
        return res.status(500).json({ error: "Failed to fetch faculty loads" });
    }
});

app.post('/faculty-loads', async (req, res) => {
    try {
        const { faculty_id, subject_id, section_id } = req.body;
        const adminId = req.body.adminId || 'admin';
        const sql = "INSERT INTO faculty_subjects (faculty_id, subject_id, section_id) VALUES (?, ?, ?)";
        const [result] = await dbPool.execute(sql, [faculty_id, subject_id, section_id]);
        logActivity(adminId, 'assign_load', `Assigned subject ${subject_id} to faculty ${faculty_id}`);
        return res.status(201).json({ message: "Faculty load assigned successfully", assignmentId: result.insertId });
    } catch (error) {
        console.error("Error assigning faculty load:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "This subject and section is already assigned to a faculty member." });
        }
        return res.status(500).json({ error: "Failed to assign faculty load" });
    }
});

app.delete('/faculty-loads/:id', async (req, res) => {
    try {
        const compositeId = req.params.id;
        const [faculty_id, subject_id, section_id] = compositeId.split('-');
        const adminId = req.body?.adminId || 'admin';

        const sql = "DELETE FROM faculty_subjects WHERE faculty_id = ? AND subject_id = ? AND section_id = ?";
        await dbPool.execute(sql, [faculty_id, subject_id, section_id]);
        logActivity(adminId, 'unassign_load', `Unassigned subject ${subject_id} from faculty ${faculty_id}`);
        return res.json({ message: "Faculty load unassigned successfully" });
    } catch (error) {
        console.error("Error deleting faculty load:", error);
        return res.status(500).json({ error: "Failed to delete faculty load" });
    }
});

// --- STUDENT SUBJECT (ENROLLMENT) ENDPOINTS ---

app.get('/student-subjects', async (req, res) => {
    try {
        const sql = `
            SELECT 
                CONCAT(ss.student_id, '-', ss.subject_id) as id,
                student.name as student_name,
                subj.name as subject_name,
                faculty.name as faculty_name,
                sec.name as section_name
            FROM student_subjects ss
            JOIN users student ON ss.student_id = student.id
            JOIN subjects subj ON ss.subject_id = subj.id
            JOIN users faculty ON ss.faculty_id = faculty.id
            LEFT JOIN sections sec ON ss.section_id = sec.id
            ORDER BY student.name, subj.name;
        `;
        const [rows] = await dbPool.query(sql);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching student subjects:", error);
        return res.status(500).json({ error: "Failed to fetch student subjects" });
    }
});

app.post('/student-subjects', async (req, res) => {
    try {
        const { student_id, subject_id, faculty_id, section_id = null } = req.body;
        const adminId = req.body.adminId || 'admin';
        const sql = "INSERT INTO student_subjects (student_id, subject_id, faculty_id, section_id) VALUES (?, ?, ?, ?)"; // Query is correct
        const [result] = await dbPool.execute(sql, [student_id, subject_id, faculty_id, section_id || null]); // Values were missing faculty_id
        logActivity(adminId, 'enroll_student', `Enrolled student ${student_id} in subject ${subject_id}`);
        return res.status(201).json({ message: "Student enrolled in subject successfully", enrollmentId: result.insertId });
    } catch (error) {
        console.error("Error enrolling student:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: "This student is already enrolled in this subject." });
        }
        return res.status(500).json({ error: "Failed to enroll student" });
    }
});

app.delete('/student-subjects/:id', async (req, res) => {
    try {
        const compositeId = req.params.id;
        const [student_id, subject_id] = compositeId.split('-');
        const adminId = req.body?.adminId || 'admin';

        const sql = "DELETE FROM student_subjects WHERE student_id = ? AND subject_id = ?";
        await dbPool.execute(sql, [student_id, subject_id]);
        logActivity(adminId, 'unenroll_student', `Unenrolled student ${student_id} from subject ${subject_id}`);
        return res.json({ message: "Student enrollment deleted successfully" });
    } catch (error) {
        console.error("Error deleting student enrollment:", error);
        return res.status(500).json({ error: "Failed to delete enrollment" });
    }
});

// --- STUDENT-SPECIFIC ENDPOINTS ---

app.get('/users/:id/subjects', async (req, res) => {
    try {
        const { id } = req.params;
        const sql = `
            SELECT
                s.id,
                s.code,
                s.name,
                ss.faculty_id,
                ss.section_id,
                f.name as instructor,
                f.name as faculty_name -- Add this line for consistency
            FROM student_subjects ss
            JOIN subjects s ON ss.subject_id = s.id
            JOIN users f ON ss.faculty_id = f.id
            WHERE ss.student_id = ?
            ORDER BY s.name;
        `;
        const [rows] = await dbPool.execute(sql, [id]);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching student's enrolled subjects:", error);
        return res.status(500).json({ error: "Failed to fetch enrolled subjects" });
    }
});

// GET /students/:studentId/evaluated-subjects - Get IDs of subjects a student has already evaluated
app.get('/students/:studentId/evaluated-subjects', async (req, res) => {
    try {
        const { studentId } = req.params;
        const sql = `SELECT subject_id FROM evaluations WHERE student_id = ?`;
        const [rows] = await dbPool.execute(sql, [studentId]);
        // Return an array of just the IDs for easy lookup on the frontend
        const evaluatedSubjectIds = rows.map(row => row.subject_id);
        return res.json(evaluatedSubjectIds);
    } catch (error) {
        console.error("Error fetching evaluated subjects:", error);
        return res.status(500).json({ error: "Failed to fetch evaluated subjects" });
    }
});

// --- ACTIVITY LOG ENDPOINTS ---

// GET /activity-logs - Get all logs for the admin
app.get('/activity-logs', async (req, res) => {
    try {
        const sql = `
            SELECT l.activity_type, l.description, DATE_FORMAT(l.timestamp, '%Y-%m-%d %h:%i %p') as timestamp, u.name as user_name, u.role as user_role
            FROM activity_logs l
            JOIN users u ON l.user_id = u.id 
            WHERE u.role = 'admin'
            ORDER BY l.timestamp DESC`;
        const [logs] = await dbPool.query(sql);
        res.json(logs);
    } catch (error) {
        console.error("Error fetching all activity logs:", error);
        res.status(500).json({ error: "Failed to fetch all activity logs." });
    }
});
// GET /users/:userId/activity-logs - Get all activity logs for a user
app.get('/users/:userId/activity-logs', async (req, res) => {
    const { userId } = req.params;
    try {
        const sql = "SELECT activity_type, description, DATE_FORMAT(timestamp, '%Y-%m-%d %h:%i %p') as timestamp FROM activity_logs WHERE user_id = ? ORDER BY timestamp DESC";
        const [logs] = await dbPool.execute(sql, [userId]);
        res.json(logs);
    } catch (error) {
        console.error("Error fetching activity logs:", error);
        res.status(500).json({ error: "Failed to fetch activity logs." });
    }
});

// POST /activity-logs - Manually create a log (for client-side events like logout)
app.post('/activity-logs', async (req, res) => {
    const { userId, activityType, description } = req.body;
    await logActivity(userId, activityType, description);
    res.status(201).json({ message: "Activity logged." });
});


// --- INCIDENT REPORT ENDPOINTS ---

// GET /incidents/student/:studentId - Get incident history for a student
app.get('/incidents/student/:studentId', async (req, res) => {
    const { studentId } = req.params;
    try {
        const sql = "SELECT id, title, description, status, DATE_FORMAT(submitted_at, '%Y-%m-%d %h:%i %p') as date FROM incidents WHERE student_id = ? ORDER BY submitted_at DESC";
        const [rows] = await dbPool.execute(sql, [studentId]);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching incident reports:", error);
        res.status(500).json({ error: "Failed to fetch incident reports." });
    }
});

// GET /incidents - For Admin Dashboard to see ALL incidents
app.get('/incidents', async (req, res) => {
    try {
        const sql = `
            SELECT 
                i.id, i.title, i.description, i.status, 
                DATE_FORMAT(i.submitted_at, '%Y-%m-%d %h:%i %p') as date,
                u.name as reporter_name,
                u.id as reporter_id,
                u.role as reporter_role
            FROM incidents i
            JOIN users u ON i.student_id = u.id
            ORDER BY i.submitted_at DESC;
        `;
        const [rows] = await dbPool.query(sql);
        res.json(rows);
    } catch (error) {
        console.error("Error fetching all incidents:", error);
        res.status(500).json({ error: "Failed to fetch all incidents." });
    }
});

// POST /incidents - Create a new incident report
app.post('/incidents', async (req, res) => {
    const { student_id, title, description } = req.body;
    if (!student_id || !title || !description) {
        return res.status(400).json({ error: "Student ID, title, and description are required." });
    }
    try {
        const sql = "INSERT INTO incidents (student_id, title, description) VALUES (?, ?, ?)";
        const [result] = await dbPool.execute(sql, [student_id, title, description]);

        // Log activity
        logActivity(student_id, 'report_incident', `Reported incident: "${title}"`);
        res.status(201).json({ message: "Incident reported successfully!", incidentId: result.insertId });
    } catch (error) {
        console.error("Error reporting incident:", error);
        res.status(500).json({ error: "Failed to report incident." });
    }
});

// PATCH /incidents/:id - Update incident status by Admin
app.patch('/incidents/:id', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    // In a real app, get admin ID from auth token
    const adminId = 'admin';

    if (!status) {
        return res.status(400).json({ error: "Status is required." });
    }

    const allowedStatuses = ['Pending', 'Under Investigation', 'Resolved'];
    if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ error: "Invalid status value." });
    }

    try {
        const sql = "UPDATE incidents SET status = ? WHERE id = ?";
        await dbPool.execute(sql, [status, id]);
        logActivity(adminId, 'update_incident', `Updated incident #${id} status to ${status}`);
        res.json({ message: "Incident status updated successfully." });
    } catch (error) {
        console.error("Error updating incident status:", error);
        res.status(500).json({ error: "Failed to update incident status." });
    }
});

// --- EVALUATION ENDPOINTS ---

// GET /evaluations - For Admin Dashboard Evaluation Reports
app.get('/evaluations', async (req, res) => {
    try {
        const sql = `
            SELECT
                e.id,
                e.student_id,
                s.name as course,
                e.comments as feedback,
                AVG(ea.rating) as rating
            FROM evaluations e
            JOIN subjects s ON e.subject_id = s.id
            LEFT JOIN evaluation_answers ea ON e.id = ea.evaluation_id
            GROUP BY e.id, e.student_id, s.name, e.comments
            ORDER BY e.submitted_at DESC;
        `;
        const [rows] = await dbPool.query(sql);
        // Ensure rating is formatted correctly, even if null
        const results = rows.map(row => ({ ...row, rating: row.rating ? parseFloat(row.rating) : 0 }));
        return res.json(results);
    } catch (error) {
        console.error("Error fetching all evaluations:", error);
        return res.status(500).json({ error: "Failed to fetch evaluation reports" });
    }
});

// GET /evaluations/stats/daily - Get daily evaluation counts for the chart
app.get('/evaluations/stats/daily', async (req, res) => {
    try {
        const days = parseInt(req.query.days, 10) || 7;
        const today = req.query.today || new Date().toISOString().split('T')[0]; // Fallback to server's UTC date

        const sql = `
            SELECT
                DATE(submitted_at) as evaluation_date,
                COUNT(*) as evaluation_count
            FROM evaluations
            WHERE DATE(submitted_at) BETWEEN DATE_SUB(?, INTERVAL ? DAY) AND ?
            GROUP BY DATE(submitted_at)
            ORDER BY evaluation_date ASC;
        `;

        const [rows] = await dbPool.execute(sql, [today, days - 1, today]);
        return res.json(rows);
    } catch (error) {
        console.error("Error fetching daily evaluation stats:", error);
        return res.status(500).json({ error: "Failed to fetch daily stats" });
    }
});

// POST /evaluations - Submit a new student evaluation
app.post("/evaluations", async (req, res) => {
  const { student_id, faculty_id, subject_id, section_id, answers, comments } =
    req.body;

  // Basic validation
  if (!student_id || !faculty_id || !subject_id || !answers) {
    return res.status(400).json({ error: "Missing required evaluation data." });
  }

  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();

    // Step 1: Insert the main evaluation record
    const evaluationQuery = `
      INSERT INTO evaluations (student_id, faculty_id, subject_id, section_id, comments)
      VALUES (?, ?, ?, ?, ?);
    `;
    const [evaluationResult] = await connection.query(evaluationQuery, [
      student_id,
      faculty_id,
      subject_id,
      section_id || null,
      comments,
    ]);
    const evaluationId = evaluationResult.insertId;

    // Step 2: Prepare and insert all the answers
    const answerEntries = Object.entries(answers); // [[questionId, rating], ...]
    if (answerEntries.length === 0) {
      throw new Error("No answers provided."); // Rollback if no answers
    }

    const answerValues = answerEntries.map(([question_id, rating]) => [
      evaluationId,
      parseInt(question_id, 10),
      rating,
    ]);

    const answersQuery = `
      INSERT INTO evaluation_answers (evaluation_id, question_id, rating)
      VALUES ?;
    `;
    await connection.query(answersQuery, [answerValues]);

    // Step 3: Commit the transaction
    await connection.commit();

    // Log activity after successful commit
    logActivity(student_id, 'evaluation', `Submitted evaluation for subject ID ${subject_id}.`);

    res.status(201).json({ message: "Evaluation submitted successfully!" });
  } catch (error) {
    await connection.rollback(); // Rollback on any error
    console.error("Error submitting evaluation:", error);

    if (error.code === "ER_DUP_ENTRY") {
      return res
        .status(409)
        .json({ error: "You have already submitted an evaluation for this subject." });
    }

    res.status(500).json({ error: "Failed to submit evaluation due to a server error." });
  } finally {
    connection.release(); // Always release the connection
  }
});
// ... (your existing server.js code)

// GET /evaluation-questions - Fetch all categories and their questions
// Used by both Student and Admin dashboards.
app.get("/evaluation-questions", async (req, res) => {
  const query = `
    SELECT 
      ec.id as category_id, 
      ec.name as category_name,
      eq.id as question_id,
      eq.text as question_text
    FROM evaluation_categories ec
    LEFT JOIN evaluation_questions eq ON ec.id = eq.category_id
    ORDER BY ec.display_order, ec.id, eq.display_order, eq.id;
  `;

  try {
    const [results] = await dbPool.query(query);

    // Process the flat results into a nested structure
    const categories = {};
    results.forEach((row) => {
      if (!categories[row.category_id]) {
        categories[row.category_id] = {
          id: row.category_id,
          name: row.category_name, // This should be 'name' for the frontend
          questions: [],
        };
      }
      // Add question only if it exists (for categories with no questions)
      if (row.question_id) {
        categories[row.category_id].questions.push({
          id: row.question_id,
          text: row.question_text, // This should be 'text' for the frontend
        });
      }
    });

    res.json(Object.values(categories));
  } catch (error) {
    console.error("Error fetching evaluation questions:", error);
    res.status(500).json({ error: "Failed to fetch evaluation questions" });
  }
});

// POST /evaluation-categories - Add a new category
app.post("/evaluation-categories", async (req, res) => {
  const { name, display_order = 0 } = req.body;
  const adminId = 'admin';

  if (!name) {
    return res.status(400).json({ error: "Category name is required." });
  }

  const query = "INSERT INTO evaluation_categories (name, display_order) VALUES (?, ?)";
  try {
    await dbPool.execute(query, [name, display_order]);
    logActivity(adminId, 'create_eval_category', `Created evaluation category: ${name}`);
    res.status(201).json({ message: "Evaluation category added successfully!" });
  } catch (error) {
    console.error("Error adding evaluation category:", error);
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "This category name already exists." });
    }
    res.status(500).json({ error: "Database error." });
  }
});

// POST /evaluation-questions - Add a new question to a category
app.post("/evaluation-questions", async (req, res) => {
  const { category_id, text, display_order = 0 } = req.body;
  const adminId = 'admin';

  if (!category_id || !text) {
    return res
      .status(400)
      .json({ error: "Category ID and question text are required." });
  }

  const query = "INSERT INTO evaluation_questions (category_id, text, display_order) VALUES (?, ?, ?)";
  try {
    await dbPool.execute(query, [category_id, text, display_order]);
    logActivity(adminId, 'create_eval_question', `Added new evaluation question.`);
    res.status(201).json({ message: "Evaluation question added successfully!" });
  } catch (error) {
    console.error("Error adding evaluation question:", error);
    res.status(500).json({ error: "Database error." });
  }
});

// --- FIX: Add routes for editing and deleting evaluation categories and questions ---

// UPDATE an evaluation category
app.put('/evaluation-categories/:id', async (req, res) => {
  const { id } = req.params;
  const { name, display_order } = req.body;

  if (!name || name.trim() === '') {
    return res.status(400).json({ error: 'Category name is required.' });
  }

  const sql = 'UPDATE evaluation_categories SET name = ?, display_order = ? WHERE id = ?';
  try {
    const [result] = await dbPool.execute(sql, [name, display_order || 0, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Category not found.' });
    }
    res.json({ message: 'Evaluation category updated successfully!' });
  } catch (error) {
    console.error("Database error updating category:", error);
    return res.status(500).json({ error: 'Failed to update evaluation category.' });
  }
});

// DELETE an evaluation category (and its questions)
app.delete('/evaluation-categories/:id', async (req, res) => {
  const { id } = req.params;
  const connection = await dbPool.getConnection();

  try {
    await connection.beginTransaction();
    // First, delete questions in the category
    await connection.execute('DELETE FROM evaluation_questions WHERE category_id = ?', [id]);
    // Then, delete the category itself
    const [result] = await connection.execute('DELETE FROM evaluation_categories WHERE id = ?', [id]);

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Category not found.' });
    }

    await connection.commit();
    res.json({ message: 'Category and all its questions deleted successfully!' });
  } catch (error) {
    await connection.rollback();
    console.error("Error deleting category:", error);
    res.status(500).json({ error: 'Failed to delete category.' });
  } finally {
    if (connection) connection.release();
  }
});

// UPDATE an evaluation question
app.put('/evaluation-questions/:id', async (req, res) => {
  const { id } = req.params;
  const { text, category_id } = req.body;

  if (!text || text.trim() === '' || !category_id) {
    return res.status(400).json({ error: 'Question text and category are required.' });
  }

  const sql = 'UPDATE evaluation_questions SET text = ?, category_id = ? WHERE id = ?';
  try {
    const [result] = await dbPool.execute(sql, [text, category_id, id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    res.json({ message: 'Evaluation question updated successfully!' });
  } catch (error) {
    console.error("Database error updating question:", error);
    return res.status(500).json({ error: 'Failed to update evaluation question.' });
  }
});

// DELETE an evaluation question
app.delete('/evaluation-questions/:id', async (req, res) => {
  const { id } = req.params;
  const sql = 'DELETE FROM evaluation_questions WHERE id = ?';
  try {
    const [result] = await dbPool.execute(sql, [id]);
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Question not found.' });
    }
    res.json({ message: 'Evaluation question deleted successfully!' });
  } catch (error) {
    console.error("Database error deleting question:", error);
    return res.status(500).json({ error: 'Failed to delete evaluation question.' });
  }
});

// ... (rest of your server.js code)
// GET /faculty/:facultyId/evaluations - Get aggregated evaluation results for a faculty member
app.get('/faculty/:facultyId/evaluations', async (req, res) => {
  const { facultyId } = req.params;

  const query = `
    SELECT 
      s.id AS subject_id,
      s.name AS subject_name,
      s.code AS subject_code,
      ec.id AS category_id,
      ec.name AS category_name,
      eq.id AS question_id,
      eq.text AS question_text,
      ea.rating,
      e.id as evaluation_id,
      e.comments
    FROM evaluations e
    JOIN evaluation_answers ea ON e.id = ea.evaluation_id
    JOIN evaluation_questions eq ON ea.question_id = eq.id
    JOIN evaluation_categories ec ON eq.category_id = ec.id
    JOIN subjects s ON e.subject_id = s.id
    WHERE e.faculty_id = ?
    ORDER BY s.name, ec.display_order, eq.display_order;
  `;

  try {
    const [rows] = await dbPool.execute(query, [facultyId]);

    if (rows.length === 0) {
      return res.json([]);
    }

    // Process the flat data into a nested structure
    const resultsBySubject = {};

    rows.forEach(row => {
      const { subject_id, subject_name, subject_code, category_id, category_name, question_id, question_text, rating, evaluation_id, comments } = row;

      if (!resultsBySubject[subject_id]) {
        resultsBySubject[subject_id] = {
          subject_id,
          subject_name,
          subject_code,
          total_evaluations: 0,
          comments: new Set(),
          questions: {},
          total_rating_sum: 0,
          total_ratings_count: 0,
        };
      }

      const subject = resultsBySubject[subject_id];
      if (comments) subject.comments.add(comments);

      if (!subject.questions[question_id]) {
        subject.questions[question_id] = {
          question_id,
          question_text,
          category_name,
          total_rating: 0,
          count: 0,
        };
      }

      // Aggregate ratings for each question
      subject.questions[question_id].total_rating += rating;
      subject.questions[question_id].count++;
    });

    // Final processing: Calculate averages and structure the detailed results
    const finalResults = Object.values(resultsBySubject).map(subject => {
      const allQuestions = Object.values(subject.questions);
      const total_sum = allQuestions.reduce((sum, q) => sum + q.total_rating, 0);
      const total_count = allQuestions.reduce((sum, q) => sum + q.count, 0);
      const overall_average = total_count > 0 ? (total_sum / total_count).toFixed(2) : "0.00";

      // Get unique evaluation count
      const evaluationIds = new Set(rows.filter(r => r.subject_id === subject.subject_id).map(r => r.evaluation_id));

      // Group questions by category for the detailed breakdown
      const categories = {};
      allQuestions.forEach(q => {
        if (!categories[q.category_name]) {
          categories[q.category_name] = {
            category_name: q.category_name,
            questions: []
          };
        }
        categories[q.category_name].questions.push({
          question_id: q.question_id,
          question_text: q.question_text,
          average_rating: q.count > 0 ? parseFloat((q.total_rating / q.count).toFixed(2)) : 0,
          response_count: q.count
        });
      });

      return {
        subject_id: subject.subject_id,
        subject_name: subject.subject_name,
        subject_code: subject.subject_code,
        comments: Array.from(subject.comments).filter(c => c.trim() !== ''),
        overall_average: parseFloat(overall_average),
        total_evaluations: evaluationIds.size,
        detailed_results: Object.values(categories)
      };
    });

    res.json(finalResults);
  } catch (error) {
    console.error("Error fetching aggregated evaluations:", error);
    res.status(500).json({ error: "Failed to fetch evaluation results" });
  }
});

// GET /admin/evaluations/aggregated - New endpoint for Admin Dashboard
app.get('/admin/evaluations/aggregated', async (req, res) => {
  const query = `
    SELECT 
      f.id AS faculty_id,
      f.name AS faculty_name,
      s.id AS subject_id,
      s.name AS subject_name,
      s.code AS subject_code,
      ec.name AS category_name,
      eq.id AS question_id,
      eq.text AS question_text,
      ea.rating,
      e.id as evaluation_id,
      e.comments
    FROM evaluations e
    JOIN users f ON e.faculty_id = f.id AND f.role = 'faculty'
    JOIN evaluation_answers ea ON e.id = ea.evaluation_id
    JOIN evaluation_questions eq ON ea.question_id = eq.id
    JOIN evaluation_categories ec ON eq.category_id = ec.id
    JOIN subjects s ON e.subject_id = s.id
    ORDER BY f.name, s.name, ec.display_order, eq.display_order;
  `;

  try {
    const [rows] = await dbPool.execute(query);

    if (rows.length === 0) {
      return res.json([]);
    }

    const resultsByFaculty = {};

    rows.forEach(row => {
      const { faculty_id, faculty_name, subject_id, subject_name, subject_code, category_name, question_id, question_text, rating, evaluation_id, comments } = row;

      if (!resultsByFaculty[faculty_id]) {
        resultsByFaculty[faculty_id] = {
          faculty_id,
          faculty_name,
          subjects: {},
        };
      }

      const facultyEntry = resultsByFaculty[faculty_id];

      if (!facultyEntry.subjects[subject_id]) {
        facultyEntry.subjects[subject_id] = {
          subject_id,
          subject_name,
          subject_code,
          comments: new Set(),
          questions: {},
        };
      }

      const subject = facultyEntry.subjects[subject_id];
      if (comments) subject.comments.add(comments);

      if (!subject.questions[question_id]) {
        subject.questions[question_id] = {
          question_id, question_text, category_name, total_rating: 0, count: 0,
        };
      }

      subject.questions[question_id].total_rating += rating;
      subject.questions[question_id].count++;
    });

    const finalResults = Object.values(resultsByFaculty).map(faculty => {
      faculty.subjects = Object.values(faculty.subjects).map(subject => {
        const allQuestions = Object.values(subject.questions);
        const total_sum = allQuestions.reduce((sum, q) => sum + q.total_rating, 0);
        const total_count = allQuestions.reduce((sum, q) => sum + q.count, 0);
        const overall_average = total_count > 0 ? parseFloat((total_sum / total_count).toFixed(2)) : 0;
        const evaluationIds = new Set(rows.filter(r => r.subject_id === subject.subject_id && r.faculty_id === faculty.faculty_id).map(r => r.evaluation_id));

        const categories = {};
        allQuestions.forEach(q => {
          if (!categories[q.category_name]) {
            categories[q.category_name] = { category_name: q.category_name, questions: [] };
          }
          categories[q.category_name].questions.push({
            question_id: q.question_id,
            question_text: q.question_text,
            average_rating: q.count > 0 ? parseFloat((q.total_rating / q.count).toFixed(2)) : 0,
          });
        });

        return { ...subject, overall_average, total_evaluations: evaluationIds.size, comments: Array.from(subject.comments).filter(c => c.trim() !== ''), detailed_results: Object.values(categories), questions: undefined };
      });
      return faculty;
    });

    res.json(finalResults);
  } catch (error) {
    console.error("Error fetching admin aggregated evaluations:", error);
    res.status(500).json({ error: "Failed to fetch evaluation results" });
  }
});

// --- EVALUATION SCHEDULE ENDPOINTS ---

// GET endpoint to fetch the current evaluation schedule
app.get("/evaluation-schedule", async (req, res) => {
  try {
    const query = "SELECT start_date, end_date FROM evaluation_schedule WHERE id = 1";
    const [results] = await dbPool.query(query);
    // Send the schedule if it exists, otherwise send an empty object
    res.json(results[0] || {});
  } catch (error) {
    console.error("Error fetching evaluation schedule:", error);
    res.status(500).json({ error: "Database error while fetching schedule." });
  }
});

// POST endpoint to set or update the evaluation schedule
app.post("/evaluation-schedule", async (req, res) => {
  const { start_date, end_date } = req.body;

  // Basic validation
  if (!start_date || !end_date) {
    return res.status(400).json({ error: "Start date and end date are required." });
  }

  if (new Date(start_date) >= new Date(end_date)) {
    return res.status(400).json({ error: "End date must be after the start date." });
  }

  // Using INSERT ... ON DUPLICATE KEY UPDATE to handle both creation and update
  const query = `
    INSERT INTO evaluation_schedule (id, start_date, end_date) 
    VALUES (1, ?, ?) 
    ON DUPLICATE KEY UPDATE start_date = VALUES(start_date), end_date = VALUES(end_date)
  `;

  try {
    await dbPool.execute(query, [start_date, end_date]);
    res.json({ message: "Evaluation schedule saved successfully!" });
  } catch (error) {
    console.error("Error saving evaluation schedule:", error);
    res.status(500).json({ error: "Failed to save schedule to the database." });
  }
});

// GET /evaluations/report/pdf - Generate PDF report for admin evaluations
app.get('/evaluations/report/pdf', async (req, res) => {
  try {
    const query = `
      SELECT
          f.id AS faculty_id,
          f.name AS faculty_name,
          s.id AS subject_id,
          s.name AS subject_name,
          s.code AS subject_code,
          ec.name AS category_name,
          eq.id AS question_id,
          eq.text AS question_text,
          ea.rating,
          e.id as evaluation_id,
          e.comments
      FROM evaluations e
      JOIN users f ON e.faculty_id = f.id AND f.role = 'faculty'
      JOIN evaluation_answers ea ON e.id = ea.evaluation_id
      JOIN evaluation_questions eq ON ea.question_id = eq.id
      JOIN evaluation_categories ec ON eq.category_id = ec.id
      JOIN subjects s ON e.subject_id = s.id
      ORDER BY f.name, s.name, ec.display_order, eq.display_order;
    `;

    const [rows] = await dbPool.execute(query);

    if (rows.length === 0) {
      return res.status(404).json({ error: "No evaluation data found to generate PDF." });
    }

    const resultsByFaculty = {};

    rows.forEach(row => {
      const { faculty_id, faculty_name, subject_id, subject_name, subject_code, category_name, question_id, question_text, rating, evaluation_id, comments } = row;

      if (!resultsByFaculty[faculty_id]) {
        resultsByFaculty[faculty_id] = {
          faculty_id,
          faculty_name,
          subjects: {},
        };
      }

      const facultyEntry = resultsByFaculty[faculty_id];

      if (!facultyEntry.subjects[subject_id]) {
        facultyEntry.subjects[subject_id] = {
          subject_id,
          subject_name,
          subject_code,
          comments: new Set(),
          questions: {},
        };
      }

      const subject = facultyEntry.subjects[subject_id];
      if (comments) subject.comments.add(comments);

      if (!subject.questions[question_id]) {
        subject.questions[question_id] = {
          question_id, question_text, category_name, total_rating: 0, count: 0,
        };
      }

      subject.questions[question_id].total_rating += rating;
      subject.questions[question_id].count++;
    });

    const finalResults = Object.values(resultsByFaculty).map(faculty => {
      faculty.subjects = Object.values(faculty.subjects).map(subject => {
        const allQuestions = Object.values(subject.questions);
        const total_sum = allQuestions.reduce((sum, q) => sum + q.total_rating, 0);
        const total_count = allQuestions.reduce((sum, q) => sum + q.count, 0);
        const overall_average = total_count > 0 ? parseFloat((total_sum / total_count).toFixed(2)) : 0;
        const evaluationIds = new Set(rows.filter(r => r.subject_id === subject.subject_id && r.faculty_id === faculty.faculty_id).map(r => r.evaluation_id));

        const categories = {};
        allQuestions.forEach(q => {
          if (!categories[q.category_name]) {
            categories[q.category_name] = { category_name: q.category_name, questions: [] };
          }
          categories[q.category_name].questions.push({
            question_id: q.question_id,
            question_text: q.question_text,
            average_rating: q.count > 0 ? parseFloat((q.total_rating / q.count).toFixed(2)) : 0,
          });
        });

        return { ...subject, overall_average, total_evaluations: evaluationIds.size, comments: Array.from(subject.comments).filter(c => c.trim() !== ''), detailed_results: Object.values(categories), questions: undefined };
      });
      return faculty;
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="evaluation_report.pdf"');

    // Create a new PDF document
    const doc = new PDFDocument({ margin: 50 });

    // Pipe the PDF to the response
    doc.pipe(res);

    addHeader(doc, 'Consolidated Evaluation Report');

    if (finalResults.length === 0) {
      doc.fontSize(16).text('No evaluation data available.', { align: 'center' });
    } else {
      finalResults.forEach((faculty, facultyIndex) => {
        if (facultyIndex > 0) doc.addPage({ margin: 50 });

        doc.fontSize(18).font('Helvetica-Bold').text(`Faculty: ${faculty.faculty_name}`, { align: 'left' });
        doc.lineCap('butt').moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#cccccc').moveDown();

        faculty.subjects.forEach(subject => {
          doc.fontSize(14).font('Helvetica-Bold').text(`Subject: ${subject.subject_name} (${subject.subject_code})`);
          doc.moveDown();

          drawSummaryBox(doc, subject.overall_average, subject.total_evaluations);
          drawComments(doc, subject.comments);
          drawDetailedRatings(doc, subject.detailed_results);

          // Add a separator between subjects for the same faculty
          doc.lineCap('butt').moveTo(50, doc.y + 10).lineTo(doc.page.width - 50, doc.y + 10).dash(3, { space: 4 }).stroke('#c7c7c7').moveDown(1);

          doc.moveDown();
        });
      });
    }

    addFooter(doc);
    doc.end();

  } catch (error) {
    console.error("Error generating PDF report:", error);
    // If a response hasn't been sent, send an error.
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF report." });
    }
  }
});

// GET /faculty/:facultyId/report/pdf - Generate PDF report for a specific faculty
app.get('/faculty/:facultyId/report/pdf', async (req, res) => {
  const { facultyId } = req.params;

  try {
    const query = `
      SELECT
          f.id AS faculty_id, f.name AS faculty_name,
          s.id AS subject_id, s.name AS subject_name, s.code AS subject_code,
          ec.name AS category_name,
          eq.id AS question_id, eq.text AS question_text,
          ea.rating, e.id as evaluation_id, e.comments
      FROM evaluations e
      JOIN users f ON e.faculty_id = f.id
      JOIN evaluation_answers ea ON e.id = ea.evaluation_id
      JOIN evaluation_questions eq ON ea.question_id = eq.id
      JOIN evaluation_categories ec ON eq.category_id = ec.id
      JOIN subjects s ON e.subject_id = s.id
      WHERE e.faculty_id = ?
      ORDER BY s.name, ec.display_order, eq.display_order;
    `;

    const [rows] = await dbPool.execute(query, [facultyId]);

    if (rows.length === 0) {
      return res.status(404).json({ error: "No evaluation data found for this faculty." });
    }

    const facultyName = rows[0].faculty_name;
    const resultsBySubject = {};

    rows.forEach(row => {
      const { subject_id, subject_name, subject_code, category_name, question_id, question_text, rating, evaluation_id, comments } = row;
      if (!resultsBySubject[subject_id]) {
        resultsBySubject[subject_id] = { subject_id, subject_name, subject_code, comments: new Set(), questions: {} };
      }
      const subject = resultsBySubject[subject_id];
      if (comments) subject.comments.add(comments);
      if (!subject.questions[question_id]) {
        subject.questions[question_id] = { question_id, question_text, category_name, total_rating: 0, count: 0 };
      }
      subject.questions[question_id].total_rating += rating;
      subject.questions[question_id].count++;
    });

    const finalResults = Object.values(resultsBySubject).map(subject => {
      const allQuestions = Object.values(subject.questions);
      const total_sum = allQuestions.reduce((sum, q) => sum + q.total_rating, 0);
      const total_count = allQuestions.reduce((sum, q) => sum + q.count, 0);
      const overall_average = total_count > 0 ? parseFloat((total_sum / total_count).toFixed(2)) : 0;
      const evaluationIds = new Set(rows.filter(r => r.subject_id === subject.subject_id).map(r => r.evaluation_id));
      const categories = {};
      allQuestions.forEach(q => {
        if (!categories[q.category_name]) {
          categories[q.category_name] = { category_name: q.category_name, questions: [] };
        }
        categories[q.category_name].questions.push({
          question_id: q.question_id,
          question_text: q.question_text,
          average_rating: q.count > 0 ? parseFloat((q.total_rating / q.count).toFixed(2)) : 0,
        });
      });
      return { ...subject, overall_average, total_evaluations: evaluationIds.size, comments: Array.from(subject.comments).filter(c => c.trim() !== ''), detailed_results: Object.values(categories) };
    });

    const doc = new PDFDocument({ margin: 50, bufferPages: true });
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="evaluation_report_${facultyName.replace(/\s+/g, '_')}.pdf"`);
    doc.pipe(res);

    addHeader(doc, `Faculty Evaluation Report`);
    doc.fontSize(14).font('Helvetica').text(`Faculty Member: ${facultyName}`, { align: 'center' }).moveDown(2);

    finalResults.forEach((subject, index) => {
      if (index > 0) doc.addPage({ margin: 50 });

      doc.fontSize(16).font('Helvetica-Bold').text(`Subject: ${subject.subject_name} (${subject.subject_code})`);
      doc.lineCap('butt').moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).stroke('#dddddd').moveDown();

      drawSummaryBox(doc, subject.overall_average, subject.total_evaluations);
      drawComments(doc, subject.comments);
      drawDetailedRatings(doc, subject.detailed_results);
    });

    addFooter(doc);
    doc.end();
  } catch (error) {
    console.error("Error generating faculty PDF report:", error);
    if (!res.headersSent) {
      res.status(500).json({ error: "Failed to generate PDF report." });
    }
  }
});

const PORT = 3001;
app.listen(PORT, async () => {
  console.log('Server is running on port 3001');
  await createAdminIfNotExists();
});