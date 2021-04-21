import React, { useEffect, useRef, useState } from 'react'
import { Engine, Scene, useBeforeRender, useClick, useHover, useScene } from 'react-babylonjs'
import { Vector3, Color3, ShaderMaterial, Effect, GlowLayer } from '@babylonjs/core'

const DefaultScale = new Vector3(1, 1, 1);
const BiggerScale = new Vector3(1.25, 1.25, 1.25);

const glsl = x => x;

Effect.ShadersStore['playgroundVertexShader'] = glsl`
  attribute vec3 position;
  attribute vec3 normal;
  attribute vec2 uv;
  uniform mat4 world;
  uniform mat4 worldViewProjection;
  varying vec3 vPositionW;
  varying vec3 vPosition;
  varying vec3 vNormalW;
  varying vec2 vUV;
  void main() {
      vPosition = position;
      vPositionW = (world * vec4(position, 1.0)).xyz;

      mat3 normalMatrix = mat3(world) / length(vec3(world[0][0],world[0][1],world[0][2]));
      vNormalW = normalMatrix * normal;
      gl_Position = worldViewProjection * vec4(position, 1.0);
      vUV = uv;
  }
`;

Effect.ShadersStore['playgroundFragmentShader'] = glsl`
  varying vec3 vPositionW;
  varying vec3 vPosition;
  varying vec3 vNormalW;
  uniform vec3 cameraPosition;

  vec3 hsl2rgb( in vec3 c )
  {
      vec3 rgb = clamp( abs(mod(c.x*6.0+vec3(0.0,4.0,2.0),6.0)-3.0)-1.0, 0.0, 1.0 );

      return c.z + c.y * (rgb-0.5)*(1.0-abs(2.0*c.z-1.0));
  }

  vec3 rgb2hsl( in vec3 c ){
    float h = 0.0;
    float s = 0.0;
    float l = 0.0;
    float r = c.r;
    float g = c.g;
    float b = c.b;
    float cMin = min( r, min( g, b ) );
    float cMax = max( r, max( g, b ) );
  
    l = ( cMax + cMin ) / 2.0;
    if ( cMax > cMin ) {
      float cDelta = cMax - cMin;
          
      s = l < .0 ? cDelta / ( cMax + cMin ) : cDelta / ( 2.0 - ( cMax + cMin ) );
          
      if ( r == cMax ) {
        h = ( g - b ) / cDelta;
      } else if ( g == cMax ) {
        h = 2.0 + ( b - r ) / cDelta;
      } else {
        h = 4.0 + ( r - g ) / cDelta;
      }
  
      if ( h < 0.0) {
        h += 6.0;
      }
      h = h / 6.0;
    }
    return vec3( h, s, l );
  }

  void main() {


      vec3 viewDirectionW = normalize(cameraPosition - vPositionW);
      float fresnelTerm = dot(viewDirectionW, vNormalW);
      fresnelTerm = clamp(1. - fresnelTerm, 0., 1.0);

      fresnelTerm = pow(fresnelTerm, 0.5);

      vec4 from = vec4(1., 1., 1., 1.);
      vec4 to = vec4(vPosition, 0.);
      vec4 color = mix(from, to, fresnelTerm);

      vec3 hsl = rgb2hsl(abs(color.xyz));
      hsl.z = max(hsl.z, 0.5);
      vec3 rgb = hsl2rgb(hsl);
      float a = 1. - fresnelTerm;

      gl_FragColor = vec4(rgb, a);
  }
`;



export function useWindowSize(breakpoints) {
  // Initialize state with undefined width/height so server and client renders match
  // Learn more here: https://joshwcomeau.com/react/the-perils-of-rehydration/
  const [windowSize, setWindowSize] = useState({
      width: undefined,
      height: undefined,
  });
  useEffect(() => {
      // Handler to call on window resize
      function handleResize() {
          // Set window width/height to state
          setWindowSize({
              width: window.innerWidth,
              height: window.innerHeight,
          });
      }
      // Add event listener
      window.addEventListener("resize", handleResize);
      // Call handler right away so state gets updated with initial window size
      handleResize();
      // Remove event listener on cleanup
      return () => window.removeEventListener("resize", handleResize);
  }, []); // Empty array ensures that effect is only run on mount
  return windowSize;
}
const Playground = () => {
  const scene = useScene()
  const objectRef = useRef();

  useEffect(() => {
    var gl = new GlowLayer("glow", scene, {
      blurKernelSize: 100,
    });
    
    const material = new ShaderMaterial(
      'playgroundMaterial',
      scene,
      {
          vertex: 'playground',
          fragment: 'playground',
      },
      {
          attributes: ['position', 'normal', 'uv', 'world0', 'world1', 'world2', 'world3'],
          uniforms: ['worldView', 'worldViewProjection', 'view', 'projection', 'direction', 'cameraPosition', 'world'],
          needAlphaBlending: true
        }
    );
    
    material.setColor3("toColor", new Color3(1.0, 0.0, 0.0))

    objectRef.current.material = material;
    gl.referenceMeshToUseItsOwnMaterial(objectRef.current);
  }, [scene])

  useBeforeRender((scene) => {
    const deltaS = scene.paused ? 0 : scene.getEngine().getDeltaTime() / 400;
    objectRef.current.rotation.y += deltaS;
  })
  
  return <sphere scaling={new Vector3(10, 10, 10)} ref={objectRef} />
}

function App() {
  const windowSize = useWindowSize();

  return (
    <Engine width={windowSize.width} height={windowSize.height} antialias canvasId='babylonJS' >
      <Scene>
        <arcRotateCamera name="camera1" target={Vector3.Zero()} alpha={Math.PI / 2} beta={Math.PI / 4} radius={8} />
        <directionalLight name="dLight" intensity={0.5} direction={ new Vector3(0, -1, 0)}/>
        <hemisphericLight name='light1' intensity={0.5} direction={Vector3.Up()} />
        <Playground />
      </Scene>
    </Engine>
  );
}

export default App;
