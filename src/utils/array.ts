export const shuffleArray = (array: unknown[], random: () => number = Math.random) => {
  let currentIndex = array.length;

  while (0 != currentIndex) {
    const randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;

    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
};
