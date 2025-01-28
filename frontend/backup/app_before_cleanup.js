const reviewsContainer = document.getElementById("reviews-container");
const detailedReviewPanel = document.getElementById("detailed-review-panel");
const closeDetailedPanelBtn = document.getElementById("close-detailed-panel-btn");
const detailedTitle = document.getElementById("detailed-title");
const detailedType = document.getElementById("detailed-type");
const detailedGenre = document.getElementById("detailed-genre");
const detailedScore = document.getElementById("detailed-score");
const detailedDate = document.getElementById("detailed-date");
const detailedFullReview = document.getElementById("detailed-full-review");
const detailedThumbnail = document.getElementById("thumbnail");
const editReviewBtn = document.getElementById("edit-review-btn");
const detailedCreator = document.getElementById("detailed-creator");

const addReviewBtn = document.getElementById("add-review-btn");
const addReviewPanel = document.getElementById("add-review-panel");
const closePanelBtn = document.getElementById("close-panel-btn");
const saveReviewBtn = document.getElementById("save-review-btn");

const genresInput = document.getElementById("genres-input");
const genresContainer = document.getElementById("genres-container");

const deleteReviewBtn = document.getElementById("delete-review-btn");

// filter related consts
const searchInput = document.getElementById("search");
const filterType = document.getElementById("filter-type");
const filterScoreMin = document.getElementById("filter-score-min");
const filterScoreMax = document.getElementById("filter-score-max");
const filterGenres = document.getElementById("filter-genres");

let reviewToEdit = null; // Track the review being edited
let selectedGenres = []; // Store selected genres dynamically

// Handle adding tags for genres
genresInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && genresInput.value.trim() !== "") {
    const genre = genresInput.value.trim();

    // Avoid duplicates
    if (!selectedGenres.includes(genre)) {
      selectedGenres.push(genre);

      // Create a tag
      const tag = document.createElement("div");
      tag.classList.add("genre-tag");
      tag.innerHTML = `<span>${genre}</span><button data-genre="${genre}">&times;</button>`;
      genresContainer.insertBefore(tag, genresInput);

      // Add remove logic for the tag
      tag.querySelector("button").addEventListener("click", (e) => {
        const genreToRemove = e.target.getAttribute("data-genre");
        selectedGenres = selectedGenres.filter((g) => g !== genreToRemove);
        tag.remove();
      });
    }

    genresInput.value = ""; // Clear input
    e.preventDefault(); // Prevent form submission
  }
});

// Show the Add Review panel
addReviewBtn.addEventListener("click", () => {
  // Reset form fields
  document.getElementById("title").value = "";
  document.getElementById("creator").value = "";
  document.getElementById("type").value = "Movie";
  document.getElementById("completion-date").value = "";
  document.getElementById("short-review").value = "";
  document.getElementById("full-review").value = "";
  document.getElementById("score").value = "";
  document.getElementById("thumbnail").value = "";

  // Reset genres
  selectedGenres = [];
  genresContainer.querySelectorAll(".genre-tag").forEach((tag) => tag.remove());

  // Hide delete button for new reviews
  deleteReviewBtn.classList.add("hidden");

  reviewToEdit = null;
  saveReviewBtn.textContent = "Save Review";

  addReviewPanel.classList.remove("hidden");
});

// Save the review (Add or Edit)
saveReviewBtn.addEventListener("click", async () => {
  const title = document.getElementById("title").value;
  const creator = document.getElementById("creator").value || "Unknown";
  const type = document.getElementById("type").value;
  const genres = selectedGenres; // Ensure this is an array of strings
  const completion_date = document.getElementById("completion-date").value;
  const short_review = document.getElementById("short-review").value;
  const full_review = document.getElementById("full-review").value;
  const score = parseFloat(document.getElementById("score").value);
  const thumbnail_url = document.getElementById("thumbnail-url").value.trim() || "placeholder.jpg";

  if (!title || !type || score < 1.0 || score > 5.0) {
    alert("Title, type, and a valid score (1.0 to 5.0) are required.");
    return;
  }

  const review = {
    title,
    creator,
    type,
    genres: JSON.stringify(genres), // Send genres as a JSON array
    completion_date,
    short_review,
    full_review,
    score,
    thumbnail_url,
  };

  try {
    if (reviewToEdit) {
      const response = await fetch(`http://localhost:3000/reviews/${reviewToEdit.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(review),
      });

      if (response.ok) {
        console.log("Review updated successfully.");

        // Fetch the updated review data
        const updatedReview = await response.json();

        // Refresh the tile list
        await fetchReviews();

        // Refresh the detailed review panel if it was open
        if (!detailedReviewPanel.classList.contains("hidden")) {
          showDetailedReview(updatedReview);
        }

        // Close the edit review panel
        addReviewPanel.classList.add("hidden");
      } else {
        console.error("Failed to update review.");
      }
    } else {
      const response = await fetch("http://localhost:3000/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(review),
      });

      if (response.ok) {
        console.log("Review added successfully.");

        // Refresh the tile list
        await fetchReviews();

        // Close the edit review panel
        addReviewPanel.classList.add("hidden");
      } else {
        console.error("Failed to save review.");
      }
    }
  } catch (error) {
    console.error("Error:", error);
  }
});

// Fetch and display reviews
async function fetchReviews() {
  try {
    const response = await fetch("http://localhost:3000/reviews");
    const reviews = await response.json();
    displayReviews(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
  }
}

// Display the reviews in the container
function displayReviews(reviews) {
  reviewsContainer.innerHTML = "";
  reviews.forEach((review) => {
    // Prepend the correct path dynamically
    const thumbnailSrc = `images/${review.thumbnail_url}`;

    const reviewElement = document.createElement("div");
    reviewElement.classList.add("review");
    reviewElement.innerHTML = `
      <img src="${thumbnailSrc}" alt="${review.title} Thumbnail" style="width:100%; border-radius: 5px;">
      <h2>${review.title}</h2>
      <p><strong>Type:</strong> ${review.type}</p>
      <p><strong>Genres:</strong> ${review.genres.join(", ")}</p>
      <p><strong>Score:</strong> ${review.score}/5.0</p>
      <p><strong>Creator:</strong> ${review.creator}</p>
      <p>${review.short_review}</p>
    `;
    reviewElement.addEventListener("click", () => showDetailedReview(review));
    reviewsContainer.appendChild(reviewElement);
  });
}





// Function to apply filters in real-time
function applyFilters() {
  const params = new URLSearchParams();

  // Add search query
  if (searchInput.value.trim()) {
    params.append("searchQuery", searchInput.value.trim());
  }

  // Add type filter
  if (filterType.value) {
    params.append("type", filterType.value);
  }

  // Add score range
  if (filterScoreMin.value) {
    params.append("scoreMin", filterScoreMin.value);
  }
  if (filterScoreMax.value) {
    params.append("scoreMax", filterScoreMax.value);
  }

  // Add genres
  if (filterGenres.value.trim()) {
    params.append("genres", filterGenres.value.trim());
  }

  fetchReviews(params.toString());
}

// Add event listeners for real-time updates
searchInput.addEventListener("input", () => applyFilters());
filterType.addEventListener("change", () => applyFilters());
filterScoreMin.addEventListener("input", () => applyFilters());
filterScoreMax.addEventListener("input", () => applyFilters());
filterGenres.addEventListener("input", () => applyFilters());

function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Debounce the search input
searchInput.addEventListener("input", debounce(() => applyFilters(), 300));

async function fetchReviews(queryString = "") {
  try {
    const response = await fetch(`http://localhost:3000/reviews?${queryString}`);
    const reviews = await response.json();
    displayReviews(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
  }
}

// Show detailed review
function showDetailedReview(review) {
  reviewToEdit = review;

  detailedTitle.textContent = review.title;
  detailedCreator.textContent = review.creator || "Unknown";
  detailedType.textContent = review.type;
  detailedGenre.textContent = Array.isArray(review.genres)
    ? review.genres.join(", ")
    : JSON.parse(review.genres || "[]").join(", "); // Handle JSON string fallback
  detailedScore.textContent = review.score;
  detailedDate.textContent = review.completion_date || "N/A";
  detailedFullReview.textContent = review.full_review || "No detailed review provided.";
  detailedThumbnail.src = `images/${review.thumbnail_url}`;

  detailedReviewPanel.classList.remove("hidden");
}


editReviewBtn.addEventListener("click", () => {
  if (!reviewToEdit) return; // Ensure there's a review to edit

  // Populate the form fields with the review's data
  document.getElementById("title").value = reviewToEdit.title;
  document.getElementById("creator").value = reviewToEdit.creator || "Unknown";
  document.getElementById("type").value = reviewToEdit.type;
  document.getElementById("completion-date").value = reviewToEdit.completion_date || "";
  document.getElementById("short-review").value = reviewToEdit.short_review || "";
  document.getElementById("full-review").value = reviewToEdit.full_review || "";
  document.getElementById("score").value = reviewToEdit.score || "";

  // Show delete button when editing
  deleteReviewBtn.classList.remove("hidden");

  // Preview the existing image or the placeholder
  const thumbnailPreview = document.getElementById("thumbnail-preview");
  if (thumbnailPreview) {
    thumbnailPreview.src = reviewToEdit.thumbnail_url
      ? `images/${reviewToEdit.thumbnail_url}`
      : "images/placeholder.jpg";
  }
  
  // Populate genres dynamically
  selectedGenres = reviewToEdit.genres || [];
  genresContainer.querySelectorAll(".genre-tag").forEach(tag => tag.remove());
  selectedGenres.forEach(genre => {
    const tag = document.createElement("div");
    tag.classList.add("genre-tag");
    tag.innerHTML = `<span>${genre}</span><button data-genre="${genre}">&times;</button>`;
    genresContainer.insertBefore(tag, genresInput);

    // Add remove logic for the tag
    tag.querySelector("button").addEventListener("click", (e) => {
      const genreToRemove = e.target.getAttribute("data-genre");
      selectedGenres = selectedGenres.filter(g => g !== genreToRemove);
      tag.remove();
    });
  });

  // Update the save button text and show the Add Review panel
  saveReviewBtn.textContent = "Save Changes";
  addReviewPanel.classList.remove("hidden");
});

deleteReviewBtn.addEventListener("click", async () => {
  if (!reviewToEdit) return;

  const confirmed = confirm(`Are you sure you want to delete the review for "${reviewToEdit.title}"?`);
  if (!confirmed) return;

  try {
    const response = await fetch(`http://localhost:3000/reviews/${reviewToEdit.id}`, {
      method: "DELETE",
    });

    if (response.ok) {
      console.log("Review deleted successfully.");
      
      // Close both panels
      detailedReviewPanel.classList.add("hidden"); // Close the detailed panel
      addReviewPanel.classList.add("hidden"); // Close the edit panel
      
      // Refresh the list of reviews
      fetchReviews();
    } else {
      console.error("Failed to delete review.");
    }
  } catch (error) {
    console.error("Error deleting review:", error);
  }
});

// Close panels
closePanelBtn.addEventListener("click", () => addReviewPanel.classList.add("hidden"));
closeDetailedPanelBtn.addEventListener("click", () => detailedReviewPanel.classList.add("hidden"));

// Initial fetch
fetchReviews();
