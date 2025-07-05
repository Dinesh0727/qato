Feature: Test the core engine with the DB Access Microservice

Background:
  * url 'http://localhost:8080'
  * def testUser = { username: 'karate-test', email: 'karate@test.com' }

  # Ensure the test user does not exist before we start
  * path 'query'
  * request { query: "DELETE FROM users WHERE username = '" + testUser.username + "'", dbType: 'mysql' }
  * method post

Scenario: Create, Read, and Delete a user

  # 1. Create the user
  * path 'query'
  * request { query: "INSERT INTO users(username, email) VALUES('" + testUser.username + "', '" + testUser.email + "')", dbType: 'mysql' }
  * method post

  # 2. Read the user back
  * path 'query'
  * request { query: "SELECT * FROM users WHERE username = '" + testUser.username + "'", dbType: 'mysql' }
  * method post
  * def user = response
  * print 'DB User:', user

  # 3. Validate the data
  * match user.email == testUser.email
  * match user.username == testUser.username

  # 4. Clean up the user
  * path 'query'
  * request { query: "DELETE FROM users WHERE username = '" + testUser.username + "'", dbType: 'mysql' }
  * method post

  # 5. Verify cleanup
  * path 'query'
  * request { query: "SELECT * FROM users WHERE username = '" + testUser.username + "'", dbType: 'mysql' }
  * method post
  * match response == {}
