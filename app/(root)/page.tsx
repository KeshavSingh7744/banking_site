import HeaderBox from '@/components/HeaderBox'
import RightSidebar from '@/components/RightSidebar';
import TotalBalanceBox from '@/components/TotalBalanceBox'

const Home = () => {

  const loggedIn = {firstName: "Keshav" , lastName : "Singh" , email:"kissu@gmail.com"};
 
  return (
    <section className='home'>

      < div className='home-content'>

        <header className='home-header'>
          <HeaderBox
            type = "greeting"
            title = "Welcome"
            user = {loggedIn?.firstName || "Guest"}
            subtext = "Access and manage your account and transactions efficiently"
          />
         <TotalBalanceBox
          accounts = {[]}
          totalBanks = {1}
          totalCurrentBalance = {1250}
         />
        </header>
        recent transactions
        </div>

        <RightSidebar user={loggedIn} transactions = {[]} banks ={[{currentBalance:151},{currentBalance:122}]}/>
      </section>



    
  )
}

export default Home
