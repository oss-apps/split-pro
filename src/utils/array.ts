export const shuffleArray = <T>(array: T[], random: () => number = Math.random) => {
  let currentIndex = array.length;

  while (0 != currentIndex) {
    const randomIndex = Math.floor(random() * currentIndex);
    currentIndex--;

    // @ts-expect-error The indices are guaranteed to be valid
    [array[currentIndex], array[randomIndex]] = [array[randomIndex], array[currentIndex]];
  }
};
