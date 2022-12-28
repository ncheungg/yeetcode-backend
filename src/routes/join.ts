import express from 'express';

const router = express.Router();

router.get('/:roomId', (req, res, next) => {
  const { roomId } = req.params;
  res.send(`The room id is ${roomId}`);
});

export default router;
