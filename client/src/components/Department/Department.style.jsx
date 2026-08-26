import styled from "@emotion/styled";
import { tagTitle } from "../../utility/tagTitle";

const DepartmentStyle = styled.div`
  /* fills its grid cell; the grid decides the column width */
  width: 100%;
  aspect-ratio: 1 / 1;
  background-image: url(${(props) => `/assets/images/${props.tag}.webp`});
  background-repeat: no-repeat;
  background-size: cover;
  background-position: center;
  background-color: yellow;
  -webkit-filter: contrast(0.9);
  -moz-filter: contrast(0.9);
  -ms-filter: contrast(0.9);
  -o-filter: contrast(0.9);
  filter: contrast(0.9);
  font-family: "Secular One", sans-serif;
  &:after {
    content: "${(props) => tagTitle[props.tag] || props.tag}";
    text-transform: uppercase;
    color: white;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 150%;
    text-align: center;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
  }
  &:before {
    content: "";
    position: absolute;
    inset: 0 0 0 0;
    background: rgba(16, 22, 50, 0.75);
  }
  @media (max-width: 580px) {
    /* short and wide on phones so the list stays scannable */
    aspect-ratio: 5 / 2;
    font-size: 75%;
  }
`;

const DepartmentCard = styled.section`
  border-radius: 30px;
  /* gutters come from the grid gap, not from per-card margins, so the
     spacing stays even at every breakpoint */
  overflow: hidden;
  position: relative;
  transition: 0.21s ease-in-out;

  // Neumorphism Shadow for 3D effect
  box-shadow: 5px 5px 15px #b8b9be, -5px -5px 15px #ffffff;

  &:hover {
    box-shadow: 8px 8px 20px #b8b9be, -8px -8px 20px #ffffff;
    transform: scale(1.05);
    transition: 0.21s ease-in-out;
  }

  &:focus-within {
    box-shadow: 8px 8px 20px #b8b9be, -8px -8px 20px #ffffff;
    transform: scale(1.02);
  }
`;

export { DepartmentStyle, DepartmentCard };
