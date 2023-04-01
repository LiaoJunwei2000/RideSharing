const _deploy_contracts = require("../migrations/2_deploy_contracts");
const truffleAssert = require("truffle-assertions");

const User = artifacts.require("User");

contract("User", (accounts) => {
  let userContract;

  beforeEach(async () => {
    userContract = await User.new();
  });

  it("should register a user successfully and emit UserCreated event", async () => {
    const tx = await userContract.registerUser(
      "Alice",
      "alice@example.com",
      false,
      "",
      "",
      {
        from: accounts[1],
      }
    );

    truffleAssert.eventEmitted(tx, "UserRegistered", (event) => {
      return (
        event.user === accounts[1] &&
        event.name === "Alice" &&
        event.email === "alice@example.com"
      );
    });
    const userInfo = await userContract.getUserInfo(accounts[1]);
    const name = userInfo[0];
    const email = userInfo[1];
    const isDriver = userInfo[2];

    assert.equal(name, "Alice");
    assert.equal(email, "alice@example.com");
    assert.equal(isDriver, false);
  });

  it("should not allow a user to register more than once", async () => {
    await userContract.registerUser(
      "Alice",
      "alice@example.com",
      false,
      "",
      "",
      {
        from: accounts[1],
      }
    );

    try {
      await userContract.registerUser(
        "Alice",
        "alice@example.com",
        false,
        "",
        "",
        {
          from: accounts[1],
        }
      );
      assert.fail("User was registered more than once");
    } catch (error) {
      assert(
        error.message.includes("Account is already registered."),
        "Expected revert for registering more than once"
      );
    }
  });
});
