const reviewsContainer = document.getElementById('reviews-container');

// Fetch reviews from the backend
async function fetchReviews() {
  try {
    const response = await fetch('http://localhost:3000/reviews');
    const reviews = await response.json();
    displayReviews(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
  }
}

// Display reviews in the container
function displayReviews(reviews) {
  reviewsContainer.innerHTML = ''; // Clear existing reviews
  reviews.forEach((review) => {
    const reviewElement = document.createElement('div');
    reviewElement.classList.add('review');
    reviewElement.innerHTML = `
      <h2>${review.title}</h2>
      <p><strong>Type:</strong> ${review.type}</p>
      <p><strong>Genre:</strong> ${review.genre}</p>
      <p><strong>Score:</strong> ${review.score}/10</p>
      <p>${review.short_review}</p>
    `;
    reviewsContainer.appendChild(reviewElement);
  });
}

// Initial fetch
fetchReviews();
