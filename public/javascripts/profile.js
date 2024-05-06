// Function to calculate total wins and losses based on queried data from the users win loss table
function calculateTotal(data) {
    let totalWins = 0;
    let totalLosses = 0;
    // for each row of data if its a win count it as a win else count as a loss
    data.forEach(row => {
      if (row.win_or_loss === 'Win') {
        totalWins++;
      } else if (row.win_or_loss === 'Loss') {
        totalLosses++;
      }
    });
    // return the total wins and losses
    return { totalWins, totalLosses };
  }
  
  // Render total wins and losses
  function renderTotal(data) {
    const { totalWins, totalLosses } = calculateTotal(data);
    const totalElement = document.createElement('div');
    totalElement.id = 'total';
    totalElement.innerHTML = `Total Wins: ${totalWins}, Total Losses: ${totalLosses}`;
    document.getElementById('profile').appendChild(totalElement);
  }

/*
Profile Component retrieves json infomation from a querry that returns the accounts total wins and losses.
Once that infomation is found the json response is returned. Wins and losses are counted using the calculateTotal
function and html table with games won and lost is inserted into profile.html.
*/
const ProfileComponent = () => {
    const [data, setData] = React.useState([]);
    const [searchTerm, setSearchTerm] = React.useState('');
    const [itemsPerPage, setItemsPerPage] = React.useState(5);
  
    const urlParams = new URLSearchParams(window.location.search);
    const name = urlParams.get('name');
  
    React.useEffect(() => {
      if (name) {
        fetch('/users/profileJSON')
        .then(response => {
            if (!response.ok) {
              throw new Error('Network response was not ok');
            }
            const contentType = response.headers.get('content-type');
            if (contentType && contentType.indexOf('application/json') !== -1) {
              return response.json();
            } else {
              throw new Error('Response is not JSON');
            }
          })
          .then((data) => {
            setData(data);
            renderTotal(data); // Call renderTotal to display total wins and losses
          })
          .catch((error) => {
            console.error('There was a problem with the fetch operation:', error);
            // Handle error, display a message to the user, etc.
          });
      }
    }, [name]); // Dependency array added
  
    const filteredData = data.filter((row) =>
      Object.values(row).some(
        (value) => typeof value === 'string' && value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  
    const handleItemsPerPageChange = (event) => {
      setItemsPerPage(parseInt(event.target.value));
    };
  
    return (
        <div style={{ fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', margin: 0 }}>Game History</h2>
            <div>
              <label htmlFor="itemsPerPage" style={{ marginRight: '10px' }}>Items per Page:</label>
              <select id="itemsPerPage" value={itemsPerPage} onChange={handleItemsPerPageChange} style={{ padding: '5px', fontSize: '14px' }}>
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={15}>15</option>
                <option value={20}>20</option>
              </select>
            </div>
          </div>
          {/* Table starts here */}
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ padding: '10px', backgroundColor: '#f2f2f2', borderBottom: '1px solid #ddd' }}>Game</th>
                <th style={{ padding: '10px', backgroundColor: '#f2f2f2', borderBottom: '1px solid #ddd' }}>Win or Loss</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, itemsPerPage).map((row, index) => (
                <tr key={JSON.stringify(row)} style={{ backgroundColor: index % 2 === 0 ? '#f9f9f9' : 'white', borderBottom: '1px solid #ddd' }}>
                  <td style={{ padding: '10px' }}>{row.game_number}</td>
                  <td style={{ padding: '10px' }}>{row.win_or_loss}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* Table ends here */}
          {/* Total Wins and Losses */}
          <div id="total" style={{ marginTop: '20px', alignItems: 'center', fontSize: '18px' }}></div>
        </div>
      );
  };
  
  ReactDOM.render(<ProfileComponent />, document.getElementById('profile'));