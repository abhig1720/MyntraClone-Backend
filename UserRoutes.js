const express = require('express');
const router = express.Router();
const usersmodel = require("./models/users");

router.get("/all", async (req, res) => {
    try {
        const users = await usersmodel.find({}, { password: 0, confirmPassword: 0 });
        res.json(users);
    } catch (err) {
        console.error("error fetching users:", err);
        res.status(500).json({ error: "Failed to fetch users" });
    }
});

router.delete("/delete/:id", async (req, res) => {
    try {
        const user = await usersmodel.findByIdAndDelete(req.params.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json({ message: "User deleted successfully" });
    } catch (err) {
        console.error("error deleting user:", err);
        res.status(500).json({ error: "Failed to delete user" });
    }
});

router.put("/:id", express.json(), async (req, res) => {
    try {
        const updateData = {
            name: req.body.name,
            phone: req.body.phone,
            email: req.body.email,
            password: req.body.password,
            confirmPassword: req.body.confirmPassword
        };
        const updatedUser = await usersmodel.findByIdAndUpdate(req.params.id, updateData, { new: true });
        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }
        res.json(updatedUser);
    } catch (err) {
        console.error("error updating user:", err);
        res.status(500).json({ error: "Failed to update user" });
    }
});

module.exports = router;

