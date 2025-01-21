document.addEventListener('DOMContentLoaded', () => {
    const itemList = document.getElementById('item-list');
    const primaryLevelSelect = document.getElementById('primary-level');
    const randomBookDetails = document.getElementById('book-details');
    const addRandomBookBtn = document.getElementById('add-random-book-btn');
    const searchButton = document.getElementById('searchButton');
    const resultsList = document.getElementById('results');
    const searchInput = document.getElementById('searchInput');
    const filterType = document.getElementById('filterType');
    const sortBy = document.getElementById('sortBy');
    let itemsData = {
        primary1: { books: [], stationery: [] },
        primary2: { books: [], stationery: [] },
        primary3: { books: [], stationery: [] },
        primary4: { books: [], stationery: [] },
        primary5: { books: [], stationery: [] },
        primary6: { books: [], stationery: [] }
    };

    const API_URL = 'http://localhost:5000';
    let authToken = localStorage.getItem('authToken');
    let searchTimeout = null; // Add this for debouncing

    // Display items in the table
    function highlightText(text, searchTerm) {
        if (!searchTerm) return text;
        const regex = new RegExp(`(${searchTerm})`, 'gi');
        return text.replace(regex, '<span class="highlight-match">$1</span>');
    }

    function displayItems(items) {
        itemList.innerHTML = '';
        const searchTerm = searchInput.value;
        
        items.forEach((item) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="checkbox" class="acquired-checkbox" data-id="${item._id}" ${item.acquired ? 'checked' : ''}></td>
                <td class="item-name">${highlightText(item.name, searchTerm)}</td>
                <td>${highlightText(item.type, searchTerm)}</td>
                <td class="item-comment">${highlightText(item.comment || '', searchTerm)}</td>
                <td>
                    <button class="btn btn-warning btn-sm edit-btn" data-id="${item._id}">Edit</button>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${item._id}">Delete</button>
                </td>
            `;
            
            if (item.acquired) {
                row.querySelector('.item-name').classList.add('strikethrough');
                row.style.backgroundColor = '#c8e6c9';
            }
            
            itemList.appendChild(row);

            // Add event listeners
            row.querySelector('.acquired-checkbox').addEventListener('change', toggleItemAcquired);
            row.querySelector('.edit-btn').addEventListener('click', editItem);
            row.querySelector('.delete-btn').addEventListener('click', deleteItem);
        });
    }

    // Load data from API
    async function loadData() {
        try {
            const level = primaryLevelSelect.value;
            const response = await fetch(`${API_URL}/items/${level}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.status === 401) {
                localStorage.removeItem('authToken');
                showLoginForm();
                return;
            }

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const items = await response.json();
            displayItems(items);
        } catch (error) {
            console.error('Error loading data:', error);
            alert('Failed to load items. Please try again.');
        }
    }

    // Toggle acquired status
    async function toggleItemAcquired(e) {
        const checkbox = e.target;
        const id = checkbox.dataset.id;
        const row = checkbox.closest('tr');
        const nameCell = row.querySelector('.item-name');

        try {
            const response = await fetch(`${API_URL}/items/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({
                    name: nameCell.textContent,
                    type: row.querySelector('td:nth-child(3)').textContent,
                    comment: row.querySelector('.item-comment').textContent,
                    acquired: checkbox.checked
                })
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            
            if (checkbox.checked) {
                nameCell.classList.add('strikethrough');
                row.style.backgroundColor = '#c8e6c9';
            } else {
                nameCell.classList.remove('strikethrough');
                row.style.backgroundColor = '';
            }
        } catch (error) {
            console.error('Error updating item:', error);
            checkbox.checked = !checkbox.checked; // Revert checkbox state
            alert('Failed to update item status. Please try again.');
        }
    }

    // Edit item
    async function editItem(e) {
        const id = e.target.dataset.id;
        const row = e.target.closest('tr');
        const newComment = prompt('Edit Comment:', row.querySelector('.item-comment').textContent);

        if (newComment !== null) {
            try {
                const response = await fetch(`${API_URL}/items/${id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        name: row.querySelector('.item-name').textContent,
                        type: row.querySelector('td:nth-child(3)').textContent,
                        comment: newComment,
                        acquired: row.querySelector('.acquired-checkbox').checked
                    })
                });

                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                loadData(); // Refresh the list
            } catch (error) {
                console.error('Error updating item:', error);
                alert('Failed to update item. Please try again.');
            }
        }
    }

    // Delete item
    async function deleteItem(e) {
        const id = e.target.dataset.id;
        
        if (confirm('Are you sure you want to delete this item?')) {
            try {
                const response = await fetch(`${API_URL}/items/${id}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });

                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                loadData(); // Refresh the list
            } catch (error) {
                console.error('Error deleting item:', error);
                alert('Failed to delete item. Please try again.');
            }
        }
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

    // Add item manually
    document.getElementById('add-item-btn').addEventListener('click', async () => {
        const itemName = prompt('Enter item name:');
        const itemType = prompt('Enter item type (e.g., Stationery, Book):');
        
        if (itemName && itemType) {
            try {
                const response = await fetch(`${API_URL}/items`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        name: itemName,
                        type: itemType,
                        primaryLevel: parseInt(primaryLevelSelect.value),
                        comment: ''
                    })
                });

                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                loadData(); // Refresh the list
            } catch (error) {
                console.error('Error adding item:', error);
                alert('Failed to add item. Please try again.');
            }
        }
    });

    // Add random book
    async function addRandomBookToList() {
        const title = addRandomBookBtn.dataset.bookTitle;
        const author = addRandomBookBtn.dataset.bookAuthor;
        
        if (title && author) {
            try {
                const response = await fetch(`${API_URL}/items`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${authToken}`
                    },
                    body: JSON.stringify({
                        name: title,
                        type: 'Book',
                        primaryLevel: parseInt(primaryLevelSelect.value),
                        comment: `Author: ${author}`
                    })
                });

                if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
                loadData();
                randomBookDetails.textContent = '';
                addRandomBookBtn.style.display = 'none';
            } catch (error) {
                console.error('Error adding random book:', error);
                alert('Failed to add book. Please try again.');
            }
        }
    }

    // Login functionality
    function showLoginForm() {
        const loginHtml = `
            <div class="login-form">
                <h2>Login</h2>
                <input type="text" id="username" placeholder="Username">
                <input type="password" id="password" placeholder="Password">
                <button onclick="login()">Login</button>
                <button onclick="showRegisterForm()">Register</button>
            </div>
        `;
        document.querySelector('.container').innerHTML = loginHtml;
    }

    // Make login function global
    window.login = async function() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('Login failed');
            }

            const data = await response.json();
            authToken = data.token;
            localStorage.setItem('authToken', authToken);
            location.reload();
        } catch (error) {
            console.error('Login failed:', error);
            alert('Login failed. Please check your credentials and try again.');
        }
    };

    // Make register function global
    window.showRegisterForm = function() {
        const registerHtml = `
            <div class="login-form">
                <h2>Register</h2>
                <input type="text" id="username" placeholder="Username">
                <input type="password" id="password" placeholder="Password">
                <button onclick="register()">Register</button>
                <button onclick="showLoginForm()">Back to Login</button>
            </div>
        `;
        document.querySelector('.container').innerHTML = registerHtml;
    };

    window.register = async function() {
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch(`${API_URL}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('Registration failed');
            }

            alert('Registration successful! Please login.');
            showLoginForm();
        } catch (error) {
            console.error('Registration failed:', error);
            alert('Registration failed. Please try again.');
        }
    };

    // Event listeners
    primaryLevelSelect.addEventListener('change', loadData);
    document.getElementById('generate-book-btn').addEventListener('click', generateRandomBook);
    addRandomBookBtn.addEventListener('click', addRandomBookToList);

    // Initialize
    if (!authToken) {
        showLoginForm();
    } else {
        loadData(); // Start with loading all items for the selected level
    }

    // Make logout function global
    window.logout = function() {
        localStorage.removeItem('authToken');
        location.reload();
    };

    // Add this function for search
    async function searchItems() {
        try {
            const searchQuery = searchInput.value.trim();
            const typeFilter = filterType.value;
            const sortValue = sortBy.value;
            const level = primaryLevelSelect.value;

            // Build query string
            const queryParams = new URLSearchParams();
            
            if (level) {
                queryParams.append('level', level);
            }
            if (searchQuery) {
                queryParams.append('q', searchQuery);
            }
            if (typeFilter) {
                queryParams.append('type', typeFilter);
            }
            if (sortValue) {
                queryParams.append('sort', sortValue);
            }

            const response = await fetch(`${API_URL}/items/search?${queryParams}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.status === 401) {
                localStorage.removeItem('authToken');
                showLoginForm();
                return;
            }

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            const items = await response.json();
            displayItems(items);
        } catch (error) {
            console.error('Error searching items:', error);
            alert('Failed to search items. Please try again.');
        }
    }

    // Update event listeners
    // Debounce search input
    searchInput.addEventListener('input', () => {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(searchItems, 300);
    });

    // Remove the keypress listener and update other listeners
    searchButton.addEventListener('click', searchItems);
    filterType.addEventListener('change', searchItems);
    sortBy.addEventListener('change', searchItems);
});
