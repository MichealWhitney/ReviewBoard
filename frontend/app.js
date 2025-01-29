// ReviewBoard Project
// 2025-01-28
// Create, view and edit reviews made on media such as books, films, television, music
// Node.js, SQLite

// -------------------------------
// Constants and Global Variables
// -------------------------------
const reviewsContainer = document.getElementById("reviews-container");

// related to the Detailed Review Panel
const detailedReviewPanel = document.getElementById("detailed-review-panel");
const closeDetailedPanelBtn = document.getElementById("close-detailed-panel-btn");
const detailedTitle = document.getElementById("detailed-title");
const detailedType = document.getElementById("detailed-type"); // not used atm
const detailedGenre = document.getElementById("detailed-genre");
const detailedScore = document.getElementById("detailed-score");
const detailedDate = document.getElementById("detailed-date");
const detailedFullReview = document.getElementById("detailed-full-review");
const detailedThumbnail = document.getElementById("thumbnail");
const editReviewBtn = document.getElementById("edit-review-btn");
const detailedCreator = document.getElementById("detailed-creator");

// related to the Add a new review panel
const addReviewPanel = document.getElementById("add-review-panel");
const addReviewBtn = document.getElementById("add-review-btn");
const closePanelBtn = document.getElementById("close-panel-btn");
const saveReviewBtn = document.getElementById("save-review-btn");
const genresInput = document.getElementById("genres");
const genresContainer = document.getElementById("genres-container");
const deleteReviewBtn = document.getElementById("delete-review-btn");

// related to the search/filter review options
const searchInput = document.getElementById("search");
const filterType = document.getElementById("filter-type");
const filterScoreMin = document.getElementById("filter-score-min");
const filterScoreMax = document.getElementById("filter-score-max");
const filterGenres = document.getElementById("filter-genres");
const sortOptions = document.getElementById("sort-options"); // sorting

let reviewToEdit = null; // Track the review being edited
let selectedGenres = []; // Store selected genres dynamically


// -------------------------------
// Event Listeners
// -------------------------------

// When we change the sort options (descending scores, recently added, etc), instantly apply the selected sorting
sortOptions.addEventListener("change", () => {
  applyFilters();
});

// Handle adding tags for genres
genresInput.addEventListener("keypress", (e) => {
  if (e.key === "Enter" && genresInput.value.trim() !== "") {
      const genre = genresInput.value.trim();

      if (!selectedGenres.includes(genre)) {
          selectedGenres.push(genre);

          const tag = document.createElement("div");
          tag.classList.add("genre-tag");
          tag.innerHTML = `<span>${genre}</span><button data-genre="${genre}">&times;</button>`;
          genresContainer.appendChild(tag);

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
  document.getElementById("thumbnail-url").value = "";

  // Reset genres
  selectedGenres = [];
  genresContainer.querySelectorAll(".genre-tag").forEach((tag) => tag.remove());

  // Hide delete button for new reviews
  deleteReviewBtn.classList.add("hidden");

  reviewToEdit = null;
  saveReviewBtn.textContent = "Save Review";

  addReviewPanel.classList.remove("hidden");
});

// Save the review (for both Adding/Editing a review)
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

// Whenever input in the filter inputs change, apply them instantly for real-time search updates
searchInput.addEventListener("input", () => applyFilters());
filterType.addEventListener("change", () => applyFilters());
filterScoreMin.addEventListener("input", () => applyFilters());
filterScoreMax.addEventListener("input", () => applyFilters());
filterGenres.addEventListener("input", () => applyFilters());

// Debounce the search input
searchInput.addEventListener("input", debounce(() => applyFilters(), 300));

// Clear all filter inputs when the clear filter button is pressed
const clearFilterBtn = document.getElementById("clear-filter-btn");
clearFilterBtn.addEventListener("click", () => {
  searchInput.value = "";
  filterType.value = "";
  filterScoreMin.value = "";
  filterScoreMax.value = "";
  filterGenres.value = "";
  sortOptions.value = "recent";

  // Re-fetch reviews with no filters applied
  applyFilters();
});

// Populate the create a new review field with the information of the review we wish to edit
// note that editing a review and creating a new review use the same panel
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
  document.getElementById("thumbnail-url").value = reviewToEdit.thumbnail_url || "";

  // Show delete button when editing
  deleteReviewBtn.classList.remove("hidden");

  // Parse and populate genres dynamically
  selectedGenres = Array.isArray(reviewToEdit.genres)
    ? reviewToEdit.genres
    : JSON.parse(reviewToEdit.genres || "[]");
    
  if (genresContainer) {
    genresContainer.querySelectorAll(".genre-tag").forEach((tag) => tag.remove());
    selectedGenres.forEach((genre) => {
      const tag = document.createElement("div");
      tag.classList.add("genre-tag");
      tag.innerHTML = `<span>${genre}</span><button data-genre="${genre}">&times;</button>`;
      genresContainer.appendChild(tag);

      // Add remove logic for the tag
      tag.querySelector("button").addEventListener("click", (e) => {
        const genreToRemove = e.target.getAttribute("data-genre");
        selectedGenres = selectedGenres.filter((g) => g !== genreToRemove);
        tag.remove();
      });
    });
  }

  // Update the save button text and show the Add Review panel
  saveReviewBtn.textContent = "Save Changes";
  addReviewPanel.classList.remove("hidden");
});

// Delete the review we are viewing
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


// -------------------------------
// Utility Functions
// -------------------------------

function debounce(func, delay) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Fetch and display reviews
async function fetchReviews(queryString = "") {
  try {
    const response = await fetch(`http://localhost:3000/reviews?${queryString}`);
    const reviews = await response.json();
    displayReviews(reviews);
  } catch (error) {
    console.error("Error fetching reviews:", error);
  }
}

// -------------------------------
// Filter and Sorting Functions
// -------------------------------

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

  // Add sorting
  if (sortOptions.value) {
    params.append("sort", sortOptions.value);
  }

  fetchReviews(params.toString());
}

// -------------------------------
// Add/Edit/Delete Review Functions
// -------------------------------

// Display the review tiles on the main page
function displayReviews(reviews) {
  reviewsContainer.innerHTML = ""; // Clear existing reviews

  reviews.forEach((review) => {
    // Prepend the correct path dynamically
    const thumbnailSrc = `images/${review.thumbnail_url}`;

    // Clone the template
    const template = document.getElementById("review-template").content.cloneNode(true);

    // Populate the template with review data
    template.querySelector(".review-thumbnail").src = thumbnailSrc;
    template.querySelector(".review-thumbnail").alt = `${review.title} Thumbnail`;
    template.querySelector(".review-title").textContent = review.title;
    template.querySelector(".review-creator").textContent = review.creator;
    template.querySelector(".review-genres").textContent = review.genres.join(", ");
    template.querySelector(".review-short").textContent = review.short_review;

    // Add score and apply correct score class
    const scoreBadge = template.querySelector(".score-badge");
    scoreBadge.textContent = `${review.score} / 5`;
    if (review.score >= 4) {
      scoreBadge.classList.add("high-score");
    } else if (review.score >= 2.5) {
      scoreBadge.classList.add("medium-score");
    } else {
      scoreBadge.classList.add("low-score");
    }

    // Add event listener for clicking on a review
    template.querySelector(".review").addEventListener("click", () => showDetailedReview(review));

    // Append the populated template to the container
    reviewsContainer.appendChild(template);
  });
}

// Show detailed review when clicked on
function showDetailedReview(review) {
  reviewToEdit = review;

  // Populate data in the detailed panel
  detailedTitle.textContent = review.title;
  detailedCreator.textContent = review.creator || "Unknown";
  detailedGenre.textContent = Array.isArray(review.genres)
    ? review.genres.join(", ")
    : JSON.parse(review.genres || "[]").join(", ");
  detailedScore.textContent = `${review.score} / 5`;
  detailedDate.textContent = review.completion_date || "N/A";
  detailedFullReview.innerHTML = review.full_review.replace(/\n/g, "<br>");
  detailedThumbnail.src = `images/${review.thumbnail_url}`;

  // Show the detailed panel
  detailedReviewPanel.classList.remove("hidden");
}

// -------------------------------
// Initialization
// -------------------------------
fetchReviews();
