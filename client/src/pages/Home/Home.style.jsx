import styled from '@emotion/styled'
import { tagTitle } from '../../utility/tagTitle';

const Banner = styled.section`
    /* Was calc(100vh - 64px): a whole screen of just the department name, so
       nothing on the page was visible until the visitor scrolled. A banner is
       a header, not a landing screen. */
    position: relative;
    height: clamp(160px, 34vh, 300px);
    /* root-relative so it works regardless of origin, without reading
       window.location at module load */
    background-image: url(${(props) => `/assets/images/${props.src}.webp`});
    background-repeat: no-repeat;
    background-size: cover;
    background-position: center;
    /* background-attachment:fixed glitches or is ignored on iOS and causes
       repaint jank while scrolling; scroll is safe for a short header */
    background-attachment: scroll;
    filter: contrast(0.9);
    font-family: 'Secular One', sans-serif;
    &:after{
        content: "${(props) => tagTitle[props.title] || props.title}";
        color: #bfff00;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: clamp(1.35rem, 5vw, 2.75rem);
        text-align: center;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%,-50%);
        width: max-content;
        max-width: 90%;
        border: 2px solid white;
        padding: 0.5em 1.25em;
        -webkit-mask-image: linear-gradient(-75deg, rgba(0,0,0,.75) 30%, #000 50%, rgba(0,0,0,.75) 70%);
        -webkit-mask-size: 200%;
        animation: shine 1.85s linear infinite;
        @keyframes shine {
            from { -webkit-mask-position: 150%; }
            to { -webkit-mask-position: -50%; }
        }
    }
    &:before{
        content: "";
        position: absolute;
        inset: 0 0 0 0;
        background: rgba(16, 22, 50,.7);
    }
    @media (prefers-reduced-motion: reduce) {
        &:after { animation: none; -webkit-mask-image: none; }
    }
`

export default Banner;
