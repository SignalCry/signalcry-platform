const express = require("express");
const cors = require("cors");
const healthRouter = require("./routes/health");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api", healthRouter);

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
