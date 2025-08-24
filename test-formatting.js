// Poorly formatted test file
const test = {
  name: 'poorly formatted',
  value: 123,
  nested: {
    property: true,
  },
};

function badFunction() {
  return test.name;
}

export default badFunction;
