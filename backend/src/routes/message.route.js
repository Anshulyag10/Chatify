import express from 'express'
import { protectRoute } from '../middleware/auth.middleware.js'; 
import { getUsersForSidebar } from '../controllers/message.controller.js'; // Controller to fetch users for sidebar
import { getMessages } from '../controllers/message.controller.js'; // Controller to fetch messages between users
import { sendMessage } from '../controllers/message.controller.js'; // Controller to handle sending messages

const router = express.Router(); 
router.get("/users", protectRoute, getUsersForSidebar);

router.get("/:id", protectRoute, getMessages);

router.post("/send/:id", protectRoute, sendMessage);

// React to a message
router.post('/react/:id', protectRoute, async (req, res, next) => {
	// delegated to controller
	const { addReaction } = await import('../controllers/message.controller.js');
	return addReaction(req, res, next);
});

// Mark message read
router.post('/read/:id', protectRoute, async (req, res, next) => {
	const { markAsRead } = await import('../controllers/message.controller.js');
	return markAsRead(req, res, next);
});

export default router; 