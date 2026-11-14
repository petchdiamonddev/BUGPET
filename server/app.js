import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.use((req, res) => {
    res.status(404).json({ message: "Page NotFound 404" });
});

export default app;