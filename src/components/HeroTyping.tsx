import React, { useState, useEffect } from 'react';

const words = [
  'AI Agent Architecture',
  'Coding Agent & Tool Calling',
  'Go & Java Cloud Native Backend',
  'Prompt & RAG Engineering',
  'High-Performance Systems',
];

export const HeroTyping: React.FC = () => {
  const [index, setIndex] = useState(0);
  const [subIndex, setSubIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [speed, setSpeed] = useState(100);

  useEffect(() => {
    if (subIndex === words[index].length + 1 && !isDeleting) {
      setTimeout(() => setIsDeleting(true), 1500);
      return;
    }

    if (subIndex === 0 && isDeleting) {
      setIsDeleting(false);
      setIndex((prev) => (prev + 1) % words.length);
      return;
    }

    const timer = setTimeout(() => {
      setSubIndex((prev) => prev + (isDeleting ? -1 : 1));
      setSpeed(isDeleting ? 40 : 90);
    }, speed);

    return () => clearTimeout(timer);
  }, [subIndex, index, isDeleting, speed]);

  return (
    <span className="inline-flex items-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-sky-300 to-blue-500 font-mono font-bold">
      {words[index].substring(0, subIndex)}
      <span className="w-2.5 h-5 ml-1 bg-cyan-400 inline-block animate-pulse"></span>
    </span>
  );
};
