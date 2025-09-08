const Confetti = () => {
    let numberArr = []

    for (var i = 0; i < 149; i++) {
        numberArr.push(i)
    }
    
    return (<>
        <style>{tags['Confetti.css']}</style>
        <style>{tags['Confetti.scss']}</style>
        <div className="wrapper-confetti">
            {numberArr.map(num => <div className={`confetti-${num}`} />)}
        </div>
    </>)
}

return Confetti;