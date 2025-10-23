export const FiltersSelectorOption = ({content, onClick, selected = false}) => {
    return (
        <span onClick={onClick} className={`projectStateButton projectFiltersSelectorOption${selected ? " selected" : ""}`}>{content}</span>
    )
}