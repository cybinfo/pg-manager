module.exports = {
  headers: jest.fn().mockReturnValue(new Map()),
  cookies: jest.fn().mockReturnValue({ get: jest.fn(), set: jest.fn() }),
}
