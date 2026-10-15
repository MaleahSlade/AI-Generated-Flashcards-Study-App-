// ============================================
// 1. APPLICATION STATE
// ============================================

const STORAGE_KEY = "flashcards-study-app";

const state = {
    decks: [],
    activeDeckId: null,
    currentCardIndex: 0,
    isCardFlipped: false,
    searchQuery: ""
};


// ============================================
// 2. DOM ELEMENT REFERENCES
// ============================================

// Deck buttons
const newDeckButton = document.querySelector("#new-deck-button");
const addDeckButton = document.querySelector("#add-deck-button");

// Deck form
const deckForm = document.querySelector("#deck-form");
const deckNameInput = document.querySelector("#deck-name");
const cancelDeckButton = document.querySelector("#cancel-deck-button");

// Deck list and information
const deckList = document.querySelector("#deck-list");
const deckTitle = document.querySelector("#deck-title");
const deckDescription = document.querySelector("#deck-description");

// Flashcard controls
const searchInput = document.querySelector("#card-search");
const shuffleButton = document.querySelector("#shuffle-button");
const newCardButton = document.querySelector("#new-card-button");
const studyArea = document.querySelector("#study-area");
const emptyState = document.querySelector("#empty-state");
const previousButton = document.querySelector("#previous-button");
const flipButton = document.querySelector("#flip-button");
const nextButton = document.querySelector("#next-button");
const cardCounter = document.querySelector("#card-counter");

// Flashcard form
const cardForm = document.querySelector("#card-form");
const cardFormTitle = document.querySelector("#card-form-title");
const cardFrontInput = document.querySelector("#card-front");
const cardBackInput = document.querySelector("#card-back");
const cancelCardButton = document.querySelector("#cancel-card-button");


// ============================================
// 3. GENERATE UNIQUE IDS
// ============================================

function generateId() {
    if (
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
    ) {
        return crypto.randomUUID();
    }

    return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}


// ============================================
// 4. SAVE DATA TO LOCALSTORAGE
// ============================================

function saveData() {
    const data = {
        decks: state.decks,
        activeDeckId: state.activeDeckId
    };

    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("Unable to save flashcards:", error);

        cardCounter.textContent =
            "Warning: Your changes could not be saved.";
    }
}


// ============================================
// 5. LOAD DATA FROM LOCALSTORAGE
// ============================================

function loadData() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);

        if (!savedData) {
            return;
        }

        const data = JSON.parse(savedData);

        if (!data || !Array.isArray(data.decks)) {
            console.warn("Saved flashcard data is invalid.");
            return;
        }

        state.decks = data.decks
            .filter(function (deck) {
                return (
                    deck &&
                    typeof deck.id === "string" &&
                    typeof deck.name === "string" &&
                    Array.isArray(deck.cards)
                );
            })
            .map(function (deck) {
                return {
                    id: deck.id,
                    name: deck.name,
                    cards: deck.cards.filter(function (card) {
                        return (
                            card &&
                            typeof card.id === "string" &&
                            typeof card.front === "string" &&
                            typeof card.back === "string"
                        );
                    })
                };
            });

        const savedActiveDeck = state.decks.find(function (deck) {
            return deck.id === data.activeDeckId;
        });

        state.activeDeckId = savedActiveDeck
            ? savedActiveDeck.id
            : (state.decks[0]?.id ?? null);

    } catch (error) {
        console.error("Unable to load saved flashcards:", error);

        state.decks = [];
        state.activeDeckId = null;
    }
}


// ============================================
// 6. GET THE ACTIVE DECK
// ============================================

function getActiveDeck() {
    return state.decks.find(function (deck) {
        return deck.id === state.activeDeckId;
    });
}


// ============================================
// 7. GET CARDS MATCHING THE SEARCH
// ============================================

function getFilteredCards() {
    const activeDeck = getActiveDeck();

    if (!activeDeck) {
        return [];
    }

    const query = state.searchQuery.trim().toLowerCase();

    if (!query) {
        return activeDeck.cards;
    }

    return activeDeck.cards.filter(function (card) {
        return (
            card.front.toLowerCase().includes(query) ||
            card.back.toLowerCase().includes(query)
        );
    });
}


// ============================================
// 8. RENDER THE DECK LIST
// ============================================

function renderDecks() {
    deckList.innerHTML = "";

    state.decks.forEach(function (deck, index) {
        const listItem = document.createElement("li");
        listItem.className = "deck-item";

        // Main deck selection button
        const selectButton = document.createElement("button");

        selectButton.type = "button";
        selectButton.className = "deck-select-button";
        selectButton.textContent = `Deck ${index + 1}: ${deck.name}`;

        if (deck.id === state.activeDeckId) {
            selectButton.classList.add("active");
            selectButton.setAttribute("aria-current", "true");
        }

        selectButton.addEventListener("click", function () {
            selectDeck(deck.id);
        });

        // Container for Rename and Delete buttons
        const actions = document.createElement("div");
        actions.className = "deck-actions";

        // Rename button
        const renameButton = document.createElement("button");

        renameButton.type = "button";
        renameButton.className = "deck-action-button";
        renameButton.textContent = "Rename";
        renameButton.setAttribute("aria-label", `Rename ${deck.name}`);

        renameButton.addEventListener("click", function () {
            renameDeck(deck.id);
        });

        // Delete button
        const deleteButton = document.createElement("button");

        deleteButton.type = "button";
        deleteButton.className =
            "deck-action-button delete-button";

        deleteButton.textContent = "Delete";
        deleteButton.setAttribute("aria-label", `Delete ${deck.name}`);

        deleteButton.addEventListener("click", function () {
            deleteDeck(deck.id);
        });

        actions.append(renameButton, deleteButton);
        listItem.append(selectButton, actions);
        deckList.appendChild(listItem);
    });
}


// ============================================
// 9. RENDER THE ACTIVE DECK
// ============================================

function renderActiveDeck() {
    const activeDeck = getActiveDeck();

    // No deck selected
    if (!activeDeck) {
        deckTitle.textContent = "Welcome to Flashcards";
        deckDescription.textContent = "Create a deck to get started.";

        emptyState.textContent =
            "Create a deck and add some flashcards to begin.";

        studyArea.replaceChildren(emptyState);

        newCardButton.disabled = true;
        shuffleButton.disabled = true;
        previousButton.disabled = true;
        flipButton.disabled = true;
        nextButton.disabled = true;

        cardCounter.textContent = "No cards yet";

        return;
    }

    const filteredCards = getFilteredCards();

    deckTitle.textContent = activeDeck.name;

    deckDescription.textContent =
        `${activeDeck.cards.length} flashcard(s) in this deck.`;

    newCardButton.disabled = false;

    // No cards available or no search matches
    if (filteredCards.length === 0) {
        if (state.searchQuery.trim()) {
            emptyState.textContent =
                "No cards match your search. Try another keyword.";
        } else {
            emptyState.textContent =
                "This deck is empty. Add a flashcard to get started.";
        }

        studyArea.replaceChildren(emptyState);

        shuffleButton.disabled = activeDeck.cards.length < 2;
        previousButton.disabled = true;
        flipButton.disabled = true;
        nextButton.disabled = true;

        cardCounter.textContent = state.searchQuery.trim()
            ? "No matching cards"
            : "No cards yet";

        return;
    }

    // Keep the index within the available search results
    if (
        state.currentCardIndex < 0 ||
        state.currentCardIndex >= filteredCards.length
    ) {
        state.currentCardIndex = 0;
        state.isCardFlipped = false;
    }

    const card = filteredCards[state.currentCardIndex];

    // Create the flashcard
    const cardElement = document.createElement("article");

    cardElement.className = "flashcard";
    cardElement.setAttribute("aria-label", "Flashcard");

    const questionHeading = document.createElement("h3");
    questionHeading.textContent = "Question";

    const questionText = document.createElement("p");
    questionText.textContent = card.front;

    cardElement.append(questionHeading, questionText);

    // Show the answer only after flipping
    if (state.isCardFlipped) {
        const answerHeading = document.createElement("h3");
        answerHeading.textContent = "Answer";

        const answerText = document.createElement("p");
        answerText.textContent = card.back;

        cardElement.append(answerHeading, answerText);
    }

    studyArea.replaceChildren(cardElement);

    // ============================================
// ADD EDIT AND DELETE BUTTONS TO THE CARD
// ============================================

const cardActions = document.createElement("div");
cardActions.className = "card-actions";

// Edit button
const editButton = document.createElement("button");
editButton.type = "button";
editButton.textContent = "Edit Card";
editButton.className = "card-action-button";

editButton.addEventListener("click", function () {
    editCard(card.id);
});

// Delete button
const deleteButton = document.createElement("button");
deleteButton.type = "button";
deleteButton.textContent = "Delete Card";
deleteButton.className = "card-action-button delete-button";

deleteButton.addEventListener("click", function () {
    deleteCard(card.id);
});

cardActions.append(editButton, deleteButton);
studyArea.appendChild(cardActions);

    // Update navigation buttons
    previousButton.disabled = state.currentCardIndex === 0;

    nextButton.disabled =
        state.currentCardIndex === filteredCards.length - 1;

    flipButton.disabled = false;
    shuffleButton.disabled = activeDeck.cards.length < 2;

    // Display the current card number
    cardCounter.textContent =
        `Card ${state.currentCardIndex + 1} of ${filteredCards.length}`;

    if (state.searchQuery.trim()) {
        cardCounter.textContent += " (search results)";
    }
}


// ============================================
// 10. SELECT A DECK
// ============================================

function selectDeck(deckId) {
    const deckExists = state.decks.some(function (deck) {
        return deck.id === deckId;
    });

    if (!deckExists) {
        return;
    }

    state.activeDeckId = deckId;
    state.currentCardIndex = 0;
    state.isCardFlipped = false;
    state.searchQuery = "";

    searchInput.value = "";

    renderDecks();
    renderActiveDeck();
    saveData();
}


// ============================================
// 11. SHOW THE DECK FORM
// ============================================

function showDeckForm() {
    delete deckForm.dataset.editingDeckId;

    deckForm.reset();

    deckForm.hidden = false;
    deckNameInput.focus();
}


// ============================================
// 12. CREATE A DECK
// ============================================

function createDeck(deckName) {
    const trimmedName = deckName.trim();

    if (!trimmedName) {
        deckNameInput.focus();
        return;
    }

    const newDeck = {
        id: generateId(),
        name: trimmedName,
        cards: []
    };

    state.decks.push(newDeck);

    state.activeDeckId = newDeck.id;
    state.currentCardIndex = 0;
    state.isCardFlipped = false;
    state.searchQuery = "";

    searchInput.value = "";

    deckForm.hidden = true;
    deckForm.reset();

    renderDecks();
    renderActiveDeck();
    saveData();
}


// ============================================
// 13. RENAME A DECK
// ============================================

function renameDeck(deckId) {
    const deck = state.decks.find(function (item) {
        return item.id === deckId;
    });

    if (!deck) {
        return;
    }

    deckForm.reset();

    deckNameInput.value = deck.name;

    deckForm.dataset.editingDeckId = deckId;
    deckForm.hidden = false;

    deckNameInput.focus();
    deckNameInput.select();
}


// ============================================
// 14. DELETE A DECK
// ============================================

function deleteDeck(deckId) {
    const deck = state.decks.find(function (item) {
        return item.id === deckId;
    });

    if (!deck) {
        return;
    }

    let confirmed;

    try {
        confirmed = window.confirm(
            `Are you sure you want to delete "${deck.name}" and all its cards?`
        );
    } catch (error) {
        console.warn("Confirmation dialog is unavailable.", error);

        cardCounter.textContent =
            "Unable to open the confirmation dialog.";

        return;
    }

    if (!confirmed) {
        return;
    }

    state.decks = state.decks.filter(function (item) {
        return item.id !== deckId;
    });

    if (state.activeDeckId === deckId) {
        state.activeDeckId = state.decks[0]?.id ?? null;

        state.currentCardIndex = 0;
        state.isCardFlipped = false;
        state.searchQuery = "";

        searchInput.value = "";
    }

    renderDecks();
    renderActiveDeck();
    saveData();
}


// ============================================
// 15. HANDLE DECK FORM SUBMISSION
// ============================================

deckForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const deckName = deckNameInput.value.trim();
    const editingDeckId = deckForm.dataset.editingDeckId;

    if (!deckName) {
        deckNameInput.focus();
        return;
    }

    // Rename an existing deck
    if (editingDeckId) {
        const deck = state.decks.find(function (item) {
            return item.id === editingDeckId;
        });

        if (deck) {
            deck.name = deckName;
        }

        delete deckForm.dataset.editingDeckId;

        deckForm.hidden = true;
        deckForm.reset();

        renderDecks();
        renderActiveDeck();
        saveData();

        return;
    }

    // Otherwise, create a new deck
    createDeck(deckName);
});


// ============================================
// 16. CANCEL THE DECK FORM
// ============================================

cancelDeckButton.addEventListener("click", function () {
    deckForm.hidden = true;
    deckForm.reset();

    delete deckForm.dataset.editingDeckId;
});


// ============================================
// 17. SHOW THE FLASHCARD FORM
// ============================================

function showCardForm() {
    const activeDeck = getActiveDeck();

    if (!activeDeck) {
        return;
    }

    cardForm.reset();

    cardFormTitle.textContent = "Create a Flashcard";

    delete cardForm.dataset.editingCardId;

    cardForm.hidden = false;
    cardFrontInput.focus();
}


// ============================================
// 18. CREATE A FLASHCARD
// ============================================

function createCard(front, back) {
    const activeDeck = getActiveDeck();

    if (!activeDeck) {
        return;
    }

    const trimmedFront = front.trim();
    const trimmedBack = back.trim();

    if (!trimmedFront || !trimmedBack) {
        return;
    }

    const newCard = {
        id: generateId(),
        front: trimmedFront,
        back: trimmedBack
    };

    activeDeck.cards.push(newCard);

    // Clear search and display the new card
    state.searchQuery = "";
    searchInput.value = "";

    state.currentCardIndex = activeDeck.cards.length - 1;
    state.isCardFlipped = false;

    cardForm.hidden = true;
    cardForm.reset();

    renderActiveDeck();
    saveData();
}
// ============================================
// EDIT AN EXISTING FLASHCARD
// ============================================

function editCard(cardId) {
    const activeDeck = getActiveDeck();

    if (!activeDeck) {
        return;
    }

    const card = activeDeck.cards.find(function (item) {
        return item.id === cardId;
    });

    if (!card) {
        return;
    }

    // Fill the form with the existing card information
    cardFrontInput.value = card.front;
    cardBackInput.value = card.back;

    // Update the form to editing mode
    cardFormTitle.textContent = "Edit Flashcard";

    const saveButton = cardForm.querySelector(
        'button[type="submit"]'
    );

    saveButton.textContent = "Save Changes";

    cardForm.dataset.editingCardId = cardId;
    cardForm.hidden = false;

    cardFrontInput.focus();
}

// ============================================
// HANDLE FLASHCARD FORM SUBMISSION
// ============================================

cardForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const front = cardFrontInput.value.trim();
    const back = cardBackInput.value.trim();
    const editingCardId = cardForm.dataset.editingCardId;

    if (!front || !back) {
        return;
    }

    // Editing an existing card
    if (editingCardId) {
        const activeDeck = getActiveDeck();

        if (!activeDeck) {
            return;
        }

        const card = activeDeck.cards.find(function (item) {
            return item.id === editingCardId;
        });

        if (card) {
            card.front = front;
            card.back = back;
        }

        delete cardForm.dataset.editingCardId;

        cardForm.hidden = true;
        cardForm.reset();

        cardFormTitle.textContent = "Create a Flashcard";

        cardForm.querySelector(
            'button[type="submit"]'
        ).textContent = "Save Flashcard";

        state.isCardFlipped = false;

        renderActiveDeck();
        saveData();

        return;
    }

    // Creating a new card
    createCard(front, back);
});
// ============================================
// DELETE A FLASHCARD
// ============================================

function deleteCard(cardId) {
    const activeDeck = getActiveDeck();

    if (!activeDeck) {
        return;
    }

    const card = activeDeck.cards.find(function (item) {
        return item.id === cardId;
    });

    if (!card) {
        return;
    }

    let confirmed;

    try {
        confirmed = window.confirm(
            "Are you sure you want to delete this flashcard?"
        );
    } catch (error) {
        console.warn("Confirmation dialog is unavailable.", error);

        cardCounter.textContent =
            "Unable to open the confirmation dialog.";

        return;
    }

    if (!confirmed) {
        return;
    }

    // Remove the selected card from the active deck
    activeDeck.cards = activeDeck.cards.filter(function (item) {
        return item.id !== cardId;
    });

    // Reset the current position and flip state
    state.currentCardIndex = 0;
    state.isCardFlipped = false;

    // Close the form if this card was being edited
    if (cardForm.dataset.editingCardId === cardId) {
        cardForm.hidden = true;
        cardForm.reset();

        delete cardForm.dataset.editingCardId;

        cardFormTitle.textContent = "Create a Flashcard";

        cardForm.querySelector(
            'button[type="submit"]'
        ).textContent = "Save Flashcard";
    }

    // Refresh the screen and save the change
    renderActiveDeck();
    saveData();
}
// ============================================
// CANCEL FLASHCARD CREATION OR EDITING
// ============================================

cancelCardButton.addEventListener("click", function () {
    cardForm.hidden = true;
    cardForm.reset();

    delete cardForm.dataset.editingCardId;

    cardFormTitle.textContent = "Create a Flashcard";

    cardForm.querySelector(
        'button[type="submit"]'
    ).textContent = "Save Flashcard";
});


// ============================================
// 21. FLIP THE CURRENT CARD
// ============================================

flipButton.addEventListener("click", function () {
    const filteredCards = getFilteredCards();

    if (filteredCards.length === 0) {
        return;
    }

    state.isCardFlipped = !state.isCardFlipped;

    renderActiveDeck();
});


// ============================================
// 22. PREVIOUS CARD
// ============================================

previousButton.addEventListener("click", function () {
    if (state.currentCardIndex > 0) {
        state.currentCardIndex--;
        state.isCardFlipped = false;

        renderActiveDeck();
    }
});


// ============================================
// 23. NEXT CARD
// ============================================

nextButton.addEventListener("click", function () {
    const filteredCards = getFilteredCards();

    if (state.currentCardIndex < filteredCards.length - 1) {
        state.currentCardIndex++;
        state.isCardFlipped = false;

        renderActiveDeck();
    }
});


// ============================================
// 24. SHUFFLE CARDS
// ============================================

function shuffleCards() {
    const activeDeck = getActiveDeck();

    if (!activeDeck || activeDeck.cards.length < 2) {
        return;
    }

    // Fisher-Yates shuffle algorithm
    for (let i = activeDeck.cards.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));

        [
            activeDeck.cards[i],
            activeDeck.cards[j]
        ] = [
            activeDeck.cards[j],
            activeDeck.cards[i]
        ];
    }

    state.currentCardIndex = 0;
    state.isCardFlipped = false;

    renderActiveDeck();
    saveData();
}

shuffleButton.addEventListener("click", shuffleCards);


// ============================================
// 25. SEARCH CARDS
// ============================================

searchInput.addEventListener("input", function () {
    state.searchQuery = searchInput.value;

    state.currentCardIndex = 0;
    state.isCardFlipped = false;

    renderActiveDeck();
});


// ============================================
// 26. CONNECT DECK BUTTONS
// ============================================

newDeckButton.addEventListener("click", showDeckForm);
addDeckButton.addEventListener("click", showDeckForm);


// ============================================
// 27. CONNECT NEW CARD BUTTON
// ============================================

newCardButton.addEventListener("click", showCardForm);


// ============================================
// 28. INITIALIZE THE APPLICATION
// ============================================

loadData();
renderDecks();
renderActiveDeck();