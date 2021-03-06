/** User class for message.ly */
const db = require("../db");
const ExpressError = require("../expressError");
const bcrypt = require('bcrypt');
const { BCRYPT_WORK_FACTOR } = require('../config');

/** User of the site. */

class User {

  /** register new user -- returns
   *    {username, password, first_name, last_name, phone}
   */

  static async register({ username, password, first_name, last_name, phone }) {
    const hashedPassword = await bcrypt.hash(
      password, BCRYPT_WORK_FACTOR);
    try {
      const result = await db.query(
        `INSERT INTO users (username, password, first_name, last_name, phone, join_at, last_login_at)
          VALUES ($1, $2, $3, $4, $5, current_timestamp, current_timestamp)
          RETURNING username, password, first_name, last_name, phone`,
        [username, hashedPassword, first_name, last_name, phone]);
      return result.rows[0];
    }
    catch (err) {
      return false;
    }
  };

  /** Authenticate: is this username/password valid? Returns boolean. */

  static async authenticate(username, password) {
    const result = await db.query(
      `SELECT password FROM users WHERE username = $1`,
      [username]);
    const user = result.rows[0];

    if (user) {
      return (await bcrypt.compare(password, user.password) === true)
    }
    return false;
  }

  /** Update last_login_at for user */

  static async updateLoginTimestamp(username) {
    const result = await db.query(
      `UPDATE users SET last_login_at=current_timestamp WHERE username = $1
        RETURNING username, last_login_at`,
      [username]);

    const user = result.rows[0];

    if (!user) {
      throw new ExpressError(`User does not exist: ${username}`, 404);
    }
    return user;
  }

  /** All: basic info on all users:
   * [{username, first_name, last_name, phone}, ...] */

  static async all() {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone
        FROM users`
    );
    return result.rows;
  }

  /** Get: get user by username
   *
   * returns {username,
   *          first_name,
   *          last_name,
   *          phone,
   *          join_at,
   *          last_login_at } */

  static async get(username) {
    const result = await db.query(
      `SELECT username, first_name, last_name, phone, join_at, last_login_at 
        FROM users WHERE username = $1`, [username]
    );

    const user = result.rows[0];

    if (!user) {
      throw new ExpressError(`User does not exist: ${username}`, 404);
    }

    return user;
  }

  /** Return messages from this user.
   *
   * [{id, to_user, body, sent_at, read_at}]
   *
   * where to_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesFrom(username) {
    // try to get user and throw error if user doesn't exist
    // await User.get(username);
    // Consider throwing error for invalid user

    const messageResult = await db.query(
      `SELECT id, to_username as to_user, body, sent_at, read_at 
        FROM messages WHERE from_username = $1`, [username]
    );

    const messages = messageResult.rows;
    let idx = 0;

    for (let message of messages) {
      let { id, to_user, body, sent_at, read_at } = message;
      let toUserResult = await db.query(
        `SELECT username, first_name, last_name, phone 
          FROM users WHERE username = $1`, [to_user]
      );

      to_user = toUserResult.rows[0];
      message = {
        id,
        to_user,
        body,
        sent_at,
        read_at
      };

      messages[idx] = message;
      idx++;
    }

    return messages;
  }

  /** Return messages to this user.
   *
   * [{id, from_user, body, sent_at, read_at}]
   *
   * where from_user is
   *   {username, first_name, last_name, phone}
   */

  static async messagesTo(username) {
    // try to get user and throw error if user doesn't exist
    // await User.get(username);
    // Consider throwing error for invalid user

    const messageResult = await db.query(
      `SELECT id, from_username as from_user, body, sent_at, read_at 
        FROM messages WHERE to_username = $1`, [username]
    );

    const messages = messageResult.rows;
    let idx = 0;

    for (let message of messages) {
      let { id, from_user, body, sent_at, read_at } = message;
      let fromUserResult = await db.query(
        `SELECT username, first_name, last_name, phone 
          FROM users WHERE username = $1`, [from_user]
      );

      from_user = fromUserResult.rows[0];
      message = {
        id,
        from_user,
        body,
        sent_at,
        read_at
      };

      messages[idx] = message;
      idx++;
    }

    return messages;
  }
}


module.exports = User;