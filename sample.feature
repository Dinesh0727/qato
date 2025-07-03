Feature: Test the core engine with a self-contained test

Background:
  * def DbUtils = Java.type('com.qato.utils.DbUtils')
  * def testUser = { username: 'karate-test', email: 'karate@test.com' }

  # Ensure the test user does not exist before we start
  * DbUtils.execute("DELETE FROM users WHERE username = '" + testUser.username + "'")

Scenario: Create, Read, and Delete a user

  # 1. Create the user
  * DbUtils.execute("INSERT INTO users(username, email) VALUES('" + testUser.username + "', '" + testUser.email + "')")

  # 2. Read the user back
  * def user = DbUtils.readRow("SELECT * FROM users WHERE username = '" + testUser.username + "'")
  * print 'DB User:', user

  # 3. Validate the data
  * match user.email == testUser.email
  * match user.username == testUser.username

  # 4. Clean up the user
  * DbUtils.execute("DELETE FROM users WHERE username = '" + testUser.username + "'")

  # 5. Verify cleanup
  * def deletedUser = DbUtils.readRow("SELECT * FROM users WHERE username = '" + testUser.username + "'")
  * match deletedUser == {}
