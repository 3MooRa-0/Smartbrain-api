import express from "express";
import bodyParser from "body-parser";
import bcrypt from "bcrypt";
import cors from "cors";
import knex from "knex";
import { configDotenv } from "dotenv";

const dotenv = configDotenv().parsed;

const db = knex({
  client: "pg",
  connection: {
    host: dotenv.DB_HOST,
    port: 5432,
    user: dotenv.DB_USERNAME,
    password: dotenv.DB_PASSWORD,
    database: dotenv.DB_NAME,
  },
});

const app = express();
app.use(bodyParser.json());
app.use(cors());
const saltRounds = 10;

app.post("/signin", (req, res) => {
  db.select("email", "hash")
    .from("login")
    .where("email", "=", req.body.email)
    .then((data) => {
      const isVaild = bcrypt.compareSync(req.body.password, data[0].hash);
      if (isVaild) {
        return db
          .select("*")
          .from("users")
          .where("email", "=", req.body.email)
          .then((user) => {
            res.json(user[0]);
          })
          .catch((err) => res.status(400).json("unable to get user"));
      } else res.status(400).json("wrong credentials 1");
    })
    .catch((err) => res.status(400).json("wrong credentials"));
});

app.post("/register", (req, res) => {
  const { email, name, password } = req.body;
  const hash = bcrypt.hashSync(password, saltRounds);
  db.transaction((trx) => {
    trx
      .insert({
        hash: hash,
        email: email,
      })
      .into("login")
      .returning("email")
      .then(async (loginEmail) => {
        const user = await trx("users").returning("*").insert({
          email: loginEmail[0].email,
          name: name,
          joined: new Date(),
        });
        res.json(user[0]);
      })
      .then(trx.commit)
      .catch(trx.rollback);
  }).catch((err) => res.status(400).json("unable to register, try again!"));
});

app.get("/profile/:id", (req, res) => {
  const { id } = req.params;
  db.select("*")
    .from("users")
    .where({ id })
    .then((user) =>
      user.length ? res.json(user[0]) : res.status(400).json("Not found")
    )
    .catch((err) => res.status(400).json("Error getting user"));
});

app.put("/image", (req, res) => {
  const { id } = req.body;
  db("users")
    .where("id", "=", id)
    .increment("entries", 1)
    .returning("entries")
    .then((entries) => {
      res.json(entries[0].entries);
    })
    .catch((err) => res.status(400).json("unable to get entries"));
});

app.listen(3000, () => {
  console.log("app is running on port");
});
