document.addEventListener('DOMContentLoaded', () => {
    const itemList = document.getElementById('item-list');
    const primaryLevelSelect = document.getElementById('primary-level');
    const randomBookDetails = document.getElementById('book-details');
    const addRandomBookBtn = document.getElementById('add-random-book-btn');
    const searchButton = document.getElementById('searchButton');
    const resultsList = document.getElementById('results');
    let itemsData = {
        primary1: { books: [], stationery: [] },
        primary2: { books: [], stationery: [] },
        primary3: { books: [], stationery: [] },
        primary4: { books: [], stationery: [] },
        primary5: { books: [], stationery: [] },
        primary6: { books: [], stationery: [] }
    };

    // Load data from data.json
    async function loadData() {
        try {
            const response = await fetch('data.json');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            itemsData = await response.json();
            loadItems(primaryLevelSelect.value); // Default to selected primary level
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    // Load items based on selected primary level
    function loadItems(level) {
        const levelKey = `primary${level}`;
        const levelData = itemsData[levelKey] || { books: [], stationery: [] };
        const allItems = [...(levelData.books || []), ...(levelData.stationery || [])];
        displayItems(allItems);
    }

    // Display items in the table
    function displayItems(items) {
        itemList.innerHTML = '';
        items.forEach((item, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="acquired-checkbox" data-index="${index}"></td>
                <td class="item-name">${item.title || item.item}</td>
                <td>${item.type || 'Stationery'}</td>
                <td class="item-comment">${item.comment || ''}</td>
                <td>
                    <button class="btn btn-warning btn-sm edit-btn" data-index="${index}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-index="${index}">Delete</button>
                </td>
            `;
            itemList.appendChild(row);

            row.querySelector('.acquired-checkbox').addEventListener('change', toggleItemAcquired);
            row.querySelector('.edit-btn').addEventListener('click', editItem);
            row.querySelector('.delete-btn').addEventListener('click', deleteItem);
        });
    }

    // Toggle acquired checkbox
function toggleItemAcquired(e) {
    const row = e.target.closest('tr');
    const nameCell = row.querySelector('.item-name');

    if (e.target.checked) {
        nameCell.classList.add('strikethrough'); // Add strikethrough
        row.style.backgroundColor = '#c8e6c9'; // Set a new background color (light green for acquired)
    } else {
        nameCell.classList.remove('strikethrough'); // Remove strikethrough
        row.style.backgroundColor = ''; // Reset to the default table row color
    }
}


    // Edit item details
    function editItem(e) {
        const row = e.target.closest('tr');
        const index = e.target.dataset.index;
        const levelKey = `primary${primaryLevelSelect.value}`;
        const levelData = itemsData[levelKey];
        const isBook = index < levelData.books.length;
        const item = isBook ? levelData.books[index] : levelData.stationery[index - levelData.books.length];

        // const newName = prompt('Edit Item Name:', item.title || item.item);
        // const newType = prompt('Edit Item Type:', item.type || 'Stationery');
        const newComment = prompt('Edit Comment:', item.comment || '');

        // if (newName !== null) item.title ? (item.title = newName) : (item.item = newName);
        // if (newType !== null) item.type = newType;
        if (newComment !== null) item.comment = newComment;

        loadItems(primaryLevelSelect.value);
    }

    // Delete an item
    function deleteItem(e) {
        const index = e.target.dataset.index;
        const levelKey = `primary${primaryLevelSelect.value}`;
        const levelData = itemsData[levelKey];
        const isBook = index < levelData.books.length;

        if (isBook) {
            levelData.books.splice(index, 1);
        } else {
            levelData.stationery.splice(index - levelData.books.length, 1);
        }

        loadItems(primaryLevelSelect.value);
    }

    // Generate random children's book
    async function generateRandomBook() {
        try {
            const response = await fetch('https://openlibrary.org/subjects/children.json?limit=50');
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const data = await response.json();
            const randomIndex = Math.floor(Math.random() * data.works.length);
            const book = data.works[randomIndex];

            randomBookDetails.textContent = `Title: ${book.title}, Author: ${book.authors[0]?.name || 'Unknown'}`;
            addRandomBookBtn.style.display = 'block';
            addRandomBookBtn.dataset.bookTitle = book.title;
            addRandomBookBtn.dataset.bookAuthor = book.authors[0]?.name || 'Unknown';
        } catch (error) {
            console.error('Error fetching random book:', error);
            randomBookDetails.textContent = 'Failed to fetch a random book. Please try again.';
            addRandomBookBtn.style.display = 'none';
        }
    }

    // Add random book to the list
    function addRandomBookToList() {
        const title = addRandomBookBtn.dataset.bookTitle;
        const author = addRandomBookBtn.dataset.bookAuthor;
        if (title && author) {
            const newBook = { title, type: 'Book', comment: `Author: ${author}` };
            itemsData[`primary${primaryLevelSelect.value}`].books.push(newBook);
            loadItems(primaryLevelSelect.value);
            randomBookDetails.textContent = '';
            addRandomBookBtn.style.display = 'none';
        }
    }

    // Add item manually
    document.getElementById('add-item-btn').addEventListener('click', () => {
        const itemName = prompt('Enter item name:');
        const itemType = prompt('Enter item type (e.g., Stationery, Book):');
        if (itemName && itemType) {
            const newItem = { item: itemName, type: itemType, comment: '' };
            itemsData[`primary${primaryLevelSelect.value}`].stationery.push(newItem);
            loadItems(primaryLevelSelect.value);
        }
    });

    // Handle primary level selection
    primaryLevelSelect.addEventListener('change', e => {
        loadItems(e.target.value);
    });

    // Event listeners
    document.getElementById('generate-book-btn').addEventListener('click', generateRandomBook);
    addRandomBookBtn.addEventListener('click', addRandomBookToList);

    // Initial data load
    loadData();
});
