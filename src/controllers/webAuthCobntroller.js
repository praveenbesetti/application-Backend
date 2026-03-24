

const jwt =require('jsonwebtoken')
const { hashPassword, comparePassword } =require('../service/encryption')
const sgMail =require('@sendgrid/mail')
const {Employee} =require('../models/employee')
const dotenv =require('dotenv')

const otpStore = new Map();
dotenv.config();

if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
    console.warn("SENDGRID_API_KEY not set; emails will be logged to console");
}

 const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "username and password are required",
            });
        }

        const employee = await Employee.findOne({ email: username });
        if (!employee) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        if (!employee.password) {
            console.error("Employee password is empty/null - please reset password");
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        const match = await comparePassword(password, employee.password);
        if (!match) {
            return res.status(401).json({ success: false, message: "Invalid credentials" });
        }

        // prepare data to store in cookie (avoid including sensitive fields)
        const empData = {
            empId: employee._id,
            firstName: employee.name,
            email: employee.email,
        };

        const token = jwt.sign(
            empData,
            process.env.JWT_SECRET,
            { expiresIn: "1d" }
        );

        return res.status(200).json({
            success: true,
            message: "Logged in successfully",
            token: token,
            data: empData,
        });


    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

 const forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ success: false, message: "Email is required" });
        }

        const employee = await Employee.findOne({ email });
        if (!employee) {
            return res.status(404).json({ success: false, message: "Email not found" });
        }

        // generate 6-digit OTP and expiration
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const expires = Date.now() + 60 * 60 * 1000; // 1h minutes

        // replace any previous entry
        otpStore.set(email, { otp, expires });

        const msg = {
            to: email,
            from: "praveenbesetti0@gmail.com",
            subject: "Your password reset code",
            text: `Your OTP for password reset is ${otp}. It expires in 5 minutes.`,
        };

        if (process.env.SENDGRID_API_KEY) {
            await sgMail.send(msg);
        }

        res.status(200).json({ success: true, message: "OTP sent to your email" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

 const verifyOTP = async (req, res) => {
    try {
        const { email, otp } = req.body;
        if (!email || !otp) {
            return res.status(400).json({ success: false, message: "Email and OTP required" });
        }

        const entry = otpStore.get(email);
        if (!entry || entry.otp !== otp || entry.expires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        res.status(200).json({ success: true, message: "OTP valid" });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

 const resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;

        if (!email || !otp || !newPassword) {
            return res.status(400).json({ success: false, message: "Email, OTP and new password are required" });
        }

        // 1. Verify OTP (DO NOT DELETE YET)
        const entry = otpStore.get(email);
        if (!entry || entry.otp !== otp || entry.expires < Date.now()) {
            return res.status(400).json({ success: false, message: "Invalid or expired OTP" });
        }

        // 2. Find the employee
        const employee = await Employee.findOne({ email });
        if (!employee) {
            return res.status(404).json({ success: false, message: "Employee not found" });
        }

        // 3. Encrypt using your existing service function
        const hashedPassword = await hashPassword(newPassword);

        // 4. Update the password field and save
        employee.password = hashedPassword;
        await employee.save();

        // 5. SUCCESS: Now safe to delete the OTP
        otpStore.delete(email);

        res.status(200).json({
            success: true,
            message: "Password reset and encrypted successfully"
        });

    } catch (error) {
        console.error("Reset Password Error:", error.message);
        return res.status(500).json({
            success: false,
            message: "Internal server error during password reset"
        });
    }
};



 const logout = async (req, res) => {
    try {
       
   
        return res.status(200).json({
            success: true,
            message: "Employee session cleared successfully",
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};

module.exports={
    login,
    forgotPassword,
    verifyOTP,
    resetPassword,
    logout
}